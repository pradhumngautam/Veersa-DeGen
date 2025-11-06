/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const userProfileRef = useRef(null);

  // Update ref when userProfile changes
  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);

  const fetchUserProfile = useCallback(async (userId, forceRefresh = false) => {
    // If we already have profile for this user, don't fetch again unless forced
    if (userProfileRef.current?.id === userId && !forceRefresh) {
      console.log("Profile already loaded for user:", userId);
      setLoading(false);
      return;
    }

    // Prevent duplicate fetches
    if (fetchingRef.current && !forceRefresh) {
      console.log("Profile fetch already in progress, skipping...");
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      console.log("Fetching profile for user:", userId);
      console.log("Supabase client:", !!supabase);

      // Small delay to ensure session is ready (especially after token refresh)
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Fetch user role - execute query with timeout
      console.log("Executing user query...");
      console.log("Supabase URL:", supabase.supabaseUrl);
      console.log("User ID:", userId);

      const queryStartTime = Date.now();

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Query timeout after 10 seconds")),
          10000
        )
      );

      // Race between query and timeout
      const queryPromise = supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      console.log("Query promise created, awaiting...");

      let userData, userError;
      try {
        const result = await Promise.race([queryPromise, timeoutPromise]);
        userData = result.data;
        userError = result.error;
        const queryTime = Date.now() - queryStartTime;
        console.log(`User query completed in ${queryTime}ms`, {
          hasData: !!userData,
          hasError: !!userError,
          error: userError,
        });
      } catch (err) {
        console.error("Query failed or timed out:", err);
        console.error("Error details:", err.message, err.stack);
        userError = err;
        userData = null;
        // If we have a cached profile, use it instead of failing
        if (userProfileRef.current?.id === userId) {
          console.log("Using cached profile due to query timeout");
          setLoading(false);
          fetchingRef.current = false;
          return;
        }
        // Reset fetching ref so we can retry only if no cached profile
        fetchingRef.current = false;
      }

      if (userError) {
        console.error("Error fetching user:", userError);
        // Don't clear existing profile on error - keep what we have
        if (!userProfileRef.current) {
          setUserProfile(null);
        }
        setLoading(false);
        return;
      }

      if (!userData) {
        console.log("No user data found");
        // Don't clear existing profile - keep what we have
        if (!userProfileRef.current) {
          setUserProfile(null);
        }
        setLoading(false);
        return;
      }

      console.log("User data fetched:", userData.role);

      // Fetch role-specific profile (it's OK if profile doesn't exist yet)
      if (userData.role === "doctor") {
        const profileQueryPromise = supabase
          .from("doctor_profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        // No timeout for profile queries - let them complete naturally
        const { data: doctorProfile, error: doctorError } =
          await profileQueryPromise;

        if (doctorError && doctorError.code !== "PGRST116") {
          console.error("Error fetching doctor profile:", doctorError);
        }
        setUserProfile({ ...userData, profile: doctorProfile || null });
      } else {
        const profileQueryPromise = supabase
          .from("patient_profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        // No timeout for profile queries - let them complete naturally
        const { data: patientProfile, error: patientError } =
          await profileQueryPromise;

        if (patientError && patientError.code !== "PGRST116") {
          console.error("Error fetching patient profile:", patientError);
        }
        setUserProfile({ ...userData, profile: patientProfile || null });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      // Don't clear existing profile on error - keep what we have
      if (!userProfileRef.current) {
        setUserProfile(null);
      }
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      console.log("Profile fetch complete, loading set to false");
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;

      if (error) {
        console.error("Error getting session:", error);
        setLoading(false);
        return;
      }

      console.log("Initial session:", session?.user?.id || "No session");
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // Ignore TOKEN_REFRESHED events - they don't need profile refetch
      if (event === "TOKEN_REFRESHED") {
        // Silent - token refresh is normal and doesn't need action
        return;
      }

      // Ignore duplicate SIGNED_IN events if we already have the profile
      // This happens when Supabase refreshes tokens or recovers sessions
      if (
        event === "SIGNED_IN" &&
        userProfileRef.current?.id === session?.user?.id
      ) {
        // Silent - duplicate SIGNED_IN events are normal (token refresh, session recovery)
        setUser(session?.user ?? null);
        setLoading(false);
        return;
      }

      // Only log important auth state changes
      if (event !== "SIGNED_IN" || !userProfileRef.current) {
        console.log(
          "Auth state changed:",
          event,
          session?.user?.id || "No user"
        );
      }

      setUser(session?.user ?? null);
      if (session?.user) {
        const currentProfile = userProfileRef.current;
        const userId = session.user.id;

        // Check if we already have the profile for this user
        if (currentProfile && currentProfile.id === userId) {
          console.log("Profile already loaded for user, skipping fetch");
          setLoading(false);
          return;
        }

        // Only fetch if we don't have the profile or if it's a different user
        if (!currentProfile || currentProfile.id !== userId) {
          // Only reset fetchingRef if it's been stuck (not currently fetching)
          if (
            !fetchingRef.current ||
            event === "SIGNED_IN" ||
            event === "INITIAL_SESSION"
          ) {
            fetchingRef.current = false; // Reset in case previous fetch hung
            await fetchUserProfile(
              userId,
              event === "SIGNED_IN" || event === "INITIAL_SESSION"
            );
          } else {
            console.log("Fetch already in progress, skipping duplicate event");
            setLoading(false);
          }
        } else {
          console.log("User ID unchanged, profile already loaded");
          setLoading(false);
        }
      } else {
        // Only clear profile on actual sign out
        if (event === "SIGNED_OUT") {
          fetchingRef.current = false;
          setUserProfile(null);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const signUp = async (email, password, role) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // Update user role
      if (data.user) {
        const { error: updateError } = await supabase
          .from("users")
          .update({ role })
          .eq("id", data.user.id);

        if (updateError) throw updateError;
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signUp,
        signIn,
        signOut,
        fetchUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

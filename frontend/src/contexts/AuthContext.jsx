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
    // Prevent duplicate fetches
    if (fetchingRef.current && !forceRefresh) {
      console.log("Profile fetch already in progress, skipping...");
      return;
    }

    // If we already have profile for this user, don't fetch again unless forced
    if (userProfileRef.current?.id === userId && !forceRefresh) {
      console.log("Profile already loaded for user:", userId);
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      console.log("Fetching profile for user:", userId);

      // Small delay to ensure session is ready (especially after token refresh)
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Fetch user role with timeout protection
      const userQueryPromise = supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Query timeout")), 15000)
      );

      const { data: userData, error: userError } = await Promise.race([
        userQueryPromise,
        timeoutPromise,
      ]).catch((error) => {
        console.error("User query failed:", error);
        return { data: null, error };
      });

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
        if (!userProfile) {
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

        const profileTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Profile query timeout")), 15000)
        );

        const { data: doctorProfile, error: doctorError } = await Promise.race([
          profileQueryPromise,
          profileTimeoutPromise,
        ]).catch((error) => {
          console.error("Doctor profile query failed:", error);
          return { data: null, error };
        });

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

        const profileTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Profile query timeout")), 15000)
        );

        const { data: patientProfile, error: patientError } =
          await Promise.race([
            profileQueryPromise,
            profileTimeoutPromise,
          ]).catch((error) => {
            console.error("Patient profile query failed:", error);
            return { data: null, error };
          });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      console.log("Auth state changed:", event, session?.user?.id || "No user");

      // Ignore TOKEN_REFRESHED events - they don't need profile refetch
      if (event === "TOKEN_REFRESHED") {
        console.log("Token refreshed, keeping existing profile");
        return;
      }

      setUser(session?.user ?? null);
      if (session?.user) {
        // Always fetch profile on SIGNED_IN event (initial sign-in)
        // But skip if it's a token refresh for same user
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          await fetchUserProfile(session.user.id);
        } else {
          // For other events, check if we need to fetch
          const currentProfile = userProfileRef.current;
          if (!currentProfile || currentProfile.id !== session.user.id) {
            await fetchUserProfile(session.user.id);
          } else {
            console.log("User ID unchanged, profile already loaded");
            setLoading(false);
          }
        }
      } else {
        // Only clear profile on actual sign out
        if (event === "SIGNED_OUT") {
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

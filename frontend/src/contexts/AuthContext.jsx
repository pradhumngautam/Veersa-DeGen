/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
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
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    try {
      // Fetch user role
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (userError) {
        console.error("Error fetching user:", userError);
        setLoading(false);
        return;
      }

      if (!userData) {
        setLoading(false);
        return;
      }

      // Fetch role-specific profile (it's OK if profile doesn't exist yet)
      if (userData.role === "doctor") {
        const { data: doctorProfile, error: doctorError } = await supabase
          .from("doctor_profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(); // Use maybeSingle() instead of single() - returns null if not found instead of error

        if (doctorError && doctorError.code !== "PGRST116") {
          console.error("Error fetching doctor profile:", doctorError);
        }
        setUserProfile({ ...userData, profile: doctorProfile || null });
      } else {
        const { data: patientProfile, error: patientError } = await supabase
          .from("patient_profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(); // Use maybeSingle() instead of single()

        if (patientError && patientError.code !== "PGRST116") {
          console.error("Error fetching patient profile:", patientError);
        }
        setUserProfile({ ...userData, profile: patientProfile || null });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setLoading(false);
    }
  };

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

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import supabase from '../../utils/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still loading
  const [user, setUser]       = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchAdminFlag = useCallback(async (userId) => {
    if (!userId) { setIsAdmin(false); return; }
    const { data } = await supabase
      .from('customers')
      .select('is_admin')
      .eq('id', userId)
      .single();
    setIsAdmin(data?.is_admin === true);
  }, []);

  useEffect(() => {
    // Hydrate from existing session on mount
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      fetchAdminFlag(s?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      fetchAdminFlag(s?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, [fetchAdminFlag]);

  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ session, user, isAdmin, signOut, loading: session === undefined }}>
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

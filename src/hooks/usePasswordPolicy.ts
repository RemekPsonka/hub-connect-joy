import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface PasswordPolicy {
  id: string;
  user_id: string;
  password_changed_at: string;
  password_expiry_days: number;
  is_oauth_user: boolean;
  force_password_change: boolean;
}

interface UsePasswordPolicyResult {
  isExpired: boolean;
  isLoading: boolean;
  daysUntilExpiry: number;
  policy: PasswordPolicy | null;
  updatePasswordChangedAt: () => Promise<void>;
  shouldShowForceChange: boolean;
}

export function usePasswordPolicy(): UsePasswordPolicyResult {
  const { user, session } = useAuth();
  const [policy, setPolicy] = useState<PasswordPolicy | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !session) {
      setIsLoading(false);
      return;
    }

    const fetchOrCreatePolicy = async () => {
      try {
        // Check if user is OAuth user (Google, etc.)
        const isOAuthUser = user.app_metadata?.provider === 'google' || 
                           user.app_metadata?.providers?.includes('google') ||
                           !user.email_confirmed_at; // OAuth users may not have email confirmation

        // Try to fetch existing policy
        const { data: existingPolicy, error: fetchError } = await supabase
          .from('user_password_policies')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('Error fetching password policy:', fetchError);
          setIsLoading(false);
          return;
        }

        if (existingPolicy) {
          setPolicy(existingPolicy as PasswordPolicy);
        } else {
          // Create new policy for user
          const { data: newPolicy, error: insertError } = await supabase
            .from('user_password_policies')
            .insert({
              user_id: user.id,
              is_oauth_user: isOAuthUser,
              password_changed_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error creating password policy:', insertError);
          } else {
            setPolicy(newPolicy as PasswordPolicy);
          }
        }
      } catch (err) {
        console.error('Password policy error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrCreatePolicy();
  }, [user, session]);

  const isExpired = (): boolean => {
    if (!policy || policy.is_oauth_user) return false;
    
    const changedAt = new Date(policy.password_changed_at);
    const expiryDate = new Date(changedAt);
    expiryDate.setDate(expiryDate.getDate() + policy.password_expiry_days);
    
    return new Date() > expiryDate;
  };

  const getDaysUntilExpiry = (): number => {
    if (!policy || policy.is_oauth_user) return 999;
    
    const changedAt = new Date(policy.password_changed_at);
    const expiryDate = new Date(changedAt);
    expiryDate.setDate(expiryDate.getDate() + policy.password_expiry_days);
    
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const updatePasswordChangedAt = async (): Promise<void> => {
    if (!user) return;

    const { error } = await supabase
      .from('user_password_policies')
      .update({ 
        password_changed_at: new Date().toISOString(),
        force_password_change: false,
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating password changed at:', error);
      throw error;
    }

    // Refetch policy
    const { data } = await supabase
      .from('user_password_policies')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setPolicy(data as PasswordPolicy);
    }
  };

  const expired = isExpired();
  const shouldShowForceChange = expired || (policy?.force_password_change ?? false);

  return {
    isExpired: expired,
    isLoading,
    daysUntilExpiry: getDaysUntilExpiry(),
    policy,
    updatePasswordChangedAt,
    shouldShowForceChange: !policy?.is_oauth_user && shouldShowForceChange,
  };
}

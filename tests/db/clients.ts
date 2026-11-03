import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect } from "vitest";
import { testDb } from "./supabase-test-env";

const options = { auth: { persistSession: false, autoRefreshToken: false } };

export type TestClients = {
  /** secret key：伺服器端 */
  admin: SupabaseClient;
  /** publishable key、未登入 */
  anon: SupabaseClient;
  /** publishable key、已登入的一般使用者 */
  signedIn: SupabaseClient;
  cleanup: () => Promise<void>;
};

export async function createTestClients(): Promise<TestClients> {
  const admin = createClient(testDb.url!, testDb.secretKey!, options);
  const anon = createClient(testDb.url!, testDb.publishableKey!, options);
  const signedIn = createClient(testDb.url!, testDb.publishableKey!, options);

  const email = `rls-test-${crypto.randomUUID()}@example.com`;
  const password = `pw-${crypto.randomUUID()}`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(created.error).toBeNull();
  const signIn = await signedIn.auth.signInWithPassword({ email, password });
  expect(signIn.error).toBeNull();

  return {
    admin,
    anon,
    signedIn,
    cleanup: async () => {
      await admin.auth.admin.deleteUser(created.data.user!.id);
    },
  };
}

import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../sync/supabaseClient";
import { getInstallationId, saveSession, type LeagueSession } from "../auth/session";

/** Lets one physical device sign into whichever league its operator hands it a code for, instead of a league being baked into the app build. */
export function LoginScreen({ onLoggedIn }: { onLoggedIn: (session: LeagueSession) => void }) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = code.trim();
    if (trimmed.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const installationId = await getInstallationId();
      const deviceLabel = Platform.OS === "ios" ? "iOS device" : "Android device";
      const { data, error: rpcError } = await supabase
        .rpc("login_with_league_code", {
          p_code: trimmed,
          p_installation_id: installationId,
          p_device_label: deviceLabel,
        })
        .single();

      if (rpcError || !data || !(data as { league_id: string | null }).league_id) {
        setError("That code didn't match a league. Check with your league organizer.");
        return;
      }

      const row = data as { league_id: string; league_name: string; device_id: string };
      const session: LeagueSession = { leagueId: row.league_id, leagueName: row.league_name, deviceId: row.device_id };
      await saveSession(session);
      onLoggedIn(session);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: 24 + insets.top, paddingBottom: 24 + insets.bottom, paddingLeft: 24 + insets.left, paddingRight: 24 + insets.right },
      ]}
    >
      <View style={styles.card}>
        <Text style={styles.title}>League login</Text>
        <Text style={styles.subtitle}>Enter the code your league organizer gave you for this device.</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={(t) => {
            setCode(t);
            setError(null);
          }}
          placeholder="League code"
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!submitting}
          onSubmitEditing={submit}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable style={[styles.button, submitting && styles.buttonDisabled]} onPress={submit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Log in</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f7", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 360, backgroundColor: "white", borderRadius: 12, padding: 24, borderWidth: 1, borderColor: "#e2e2e6" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 6 },
  subtitle: { color: "#666", marginBottom: 18, lineHeight: 20 },
  input: { borderWidth: 1, borderColor: "#d5d5db", borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 12 },
  error: { color: "#b00020", marginBottom: 12 },
  button: { backgroundColor: "#1a1a2e", borderRadius: 8, padding: 14, alignItems: "center" },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "white", fontWeight: "700", fontSize: 15 },
});

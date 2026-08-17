import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { AlertBox, Button, Card } from '../components/ui';
import { colors } from '../lib/theme';
import type { AuthStackParamList } from '../navigation/types';
import type { AuthSession } from '@freshly/shared-types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  async function onSubmit() {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await api.post<AuthSession>('/auth/login', { email: email.trim(), password });
      if (data.user.role !== 'cleaner') {
        setError('This app is for cleaners. Use the web app for customer or admin accounts.');
        setLoading(false);
        return;
      }
      login(data.accessToken, data.refreshToken, data.user);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.tagline}>Cleaner sign-in</Text>
        <AlertBox message={error} />
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.co.za"
            value={email}
            onChangeText={setEmail}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
          />
        </View>
        <Button onPress={onSubmit} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
        <Text style={styles.switchText}>
          Don&apos;t have an account?{' '}
          <Text style={styles.switchLink} onPress={() => navigation.navigate('Register')}>
            Sign up
          </Text>
        </Text>
        <Card style={{ marginTop: 24 }}>
          <Text style={styles.demoLabel}>Demo cleaner account (password: password123)</Text>
          <Text style={styles.demoLine}>lindiwe@example.co.za</Text>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.warmWhite },
  logo: { width: 72, height: 72, marginBottom: 4 },
  tagline: { fontSize: 15, color: colors.charcoalMuted, marginTop: 4, marginBottom: 28 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.charcoalMuted, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: colors.cardWhite,
    color: colors.charcoal,
  },
  switchText: { textAlign: 'center', marginTop: 20, fontSize: 14, color: colors.charcoalMuted },
  switchLink: { color: colors.forest, fontWeight: '600' },
  demoLabel: { fontSize: 12, fontWeight: '700', color: colors.charcoal, marginBottom: 4 },
  demoLine: { fontSize: 12, color: colors.charcoalMuted },
});

import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, ApiError } from '../lib/api';
import { AlertBox, Button } from '../components/ui';
import { colors } from '../lib/theme';
import type { AuthStackParamList } from '../navigation/types';
import type { AuthSession } from '@freshly/shared-types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await api.post<AuthSession>('/auth/register', {
        role: 'cleaner',
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        city: city.trim(),
        province: city.trim() ? 'Gauteng' : undefined,
      });
      setSuccessMsg(data.message || 'Application submitted — pending admin approval.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.tagline}>Apply as a cleaner</Text>
        <AlertBox message={error} />
        <AlertBox message={successMsg} type="info" />
        <View style={styles.field}>
          <Text style={styles.label}>Full name</Text>
          <TextInput style={styles.input} placeholder="Jane Dlamini" value={fullName} onChangeText={setFullName} />
        </View>
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
          <Text style={styles.label}>Phone</Text>
          <TextInput style={styles.input} placeholder="082 123 4567" value={phone} onChangeText={setPhone} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>City</Text>
          <TextInput style={styles.input} placeholder="Sandton" value={city} onChangeText={setCity} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="At least 8 characters"
            value={password}
            onChangeText={setPassword}
          />
        </View>
        <Button onPress={onSubmit} disabled={loading}>
          {loading ? 'Submitting…' : 'Create account'}
        </Button>
        <Text style={styles.switchText}>
          Already have an account?{' '}
          <Text style={styles.switchLink} onPress={() => navigation.navigate('Login')}>
            Sign in
          </Text>
        </Text>
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
});

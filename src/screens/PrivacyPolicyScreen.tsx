// src/screens/PrivacyPolicyScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Linking,
} from 'react-native';

type Props = {
  onAccept: () => void;
  onDecline: () => void;
};

const PRIVACY_POLICY_URL = 'https://tarotoracleapp.com/privacy-policy/';

const PrivacyPolicyScreen: React.FC<Props> = ({ onAccept, onDecline }) => {
  const [accepted, setAccepted] = useState(false);

  const openPrivacyPolicy = () => {
    Linking.openURL(PRIVACY_POLICY_URL).catch(err => 
      console.error('Failed to open privacy policy URL:', err)
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.subtitle}>Please review and accept our privacy policy to continue</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.infoText}>
          Before using Tarot Oracle, you must read and accept our Privacy Policy.
        </Text>
        
        <TouchableOpacity style={styles.linkButton} onPress={openPrivacyPolicy}>
          <Text style={styles.linkButtonText}>📄 Read Full Privacy Policy</Text>
          <Text style={styles.linkUrl}>{PRIVACY_POLICY_URL}</Text>
        </TouchableOpacity>

        <Text style={styles.summaryTitle}>Key Points:</Text>
        <Text style={styles.summaryText}>
          • We collect and process your personal information to provide our tarot reading services{'\n'}
          • Your data is stored securely and used only for app functionality{'\n'}
          • We do not share your personal information with third parties without consent{'\n'}
          • You have the right to access, modify, or delete your data{'\n'}
          • We use cookies and similar technologies to improve your experience{'\n'}
        </Text>
        
        <Text style={styles.noteText}>
          Tap the button above to read our complete Privacy Policy in your browser.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.checkbox, accepted && styles.checkboxChecked]}
          onPress={() => setAccepted(!accepted)}
        >
          <View style={styles.checkboxInner}>
            {accepted && <View style={styles.checkmark} />}
          </View>
          <Text style={styles.checkboxText}>I have read and accept the Privacy Policy</Text>
        </TouchableOpacity>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.declineButton]}
            onPress={onDecline}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.acceptButton, !accepted && styles.buttonDisabled]}
            onPress={onAccept}
            disabled={!accepted}
          >
            <Text style={[styles.acceptButtonText, !accepted && styles.buttonTextDisabled]}>
              Accept & Continue
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default PrivacyPolicyScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#21324f',
  },
  title: {
    color: '#9fc5ff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#7aa0c4',
    fontSize: 14,
  },
  content: {
    flex: 1,
    backgroundColor: '#0d1423',
  },
  contentContainer: {
    padding: 20,
  },
  infoText: {
    color: '#c2dbff',
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 24,
  },
  linkButton: {
    backgroundColor: '#1e3a8a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  linkUrl: {
    color: '#9fc5ff',
    fontSize: 12,
    textAlign: 'center',
  },
  summaryTitle: {
    color: '#9fc5ff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  summaryText: {
    color: '#c2dbff',
    fontSize: 14,
    lineHeight: 24,
    marginBottom: 20,
  },
  noteText: {
    color: '#7aa0c4',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#21324f',
    backgroundColor: '#000',
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#7aa0c4',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {},
  checkmark: {
    width: 14,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#9fc5ff',
  },
  checkboxText: {
    color: '#c2dbff',
    fontSize: 14,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#0d1423',
    borderWidth: 1,
    borderColor: '#21324f',
  },
  declineButtonText: {
    color: '#7aa0c4',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: '#1e3a8a',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonTextDisabled: {
    opacity: 0.5,
  },
});

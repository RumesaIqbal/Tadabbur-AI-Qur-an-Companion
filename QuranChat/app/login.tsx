import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  ActivityIndicator,
} from "react-native-paper";
import { useRouter } from "expo-router";
import Animated, { FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "../services/supabase";
import { colors } from "../theme";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    checkSession();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth Event:", event);
      if (session) router.replace("/(tabs)/home");
    });
    return () => subscription.unsubscribe();
  }, []);

  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) router.replace("/(tabs)/home");
  }

  const dismissKeyboard = () => Keyboard.dismiss();

  async function handleAuth() {
    dismissKeyboard();
    if (!email.trim()) {
      Alert.alert("Missing Email", "Please enter your email.");
      return;
    }
    if (!password.trim()) {
      Alert.alert("Missing Password", "Please enter your password.");
      return;
    }
    if (password.length < 6) {
      Alert.alert(
        "Weak Password",
        "Password must contain at least 6 characters."
      );
      return;
    }
    if (isSignup && !fullName.trim()) {
      Alert.alert("Missing Name", "Please enter your full name.");
      return;
    }

    setLoading(true);

    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: fullName.trim(),
            },
          },
        });

        if (error) {
          Alert.alert("Signup Failed", error.message);
        } else {
          setShowConfirmModal(true);
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          Alert.alert("Login Failed", error.message);
        }
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleConfirmModalClose = () => {
    setShowConfirmModal(false);
    setIsSignup(false);
    setPassword("");
    setFullName("");
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <LinearGradient
        colors={["#0a1a1a", "#0F2E2E", "#1a3a3a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Animated.View
            entering={FadeInUp.duration(700)}
            style={styles.logoContainer}
          >
            <View style={styles.logoCircle}>
              <Image
                source={require("../assets/images/logo.png")}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>

            <Text style={styles.title}>Tadabbur</Text>
            <View style={styles.dividerLine} />
            <Text style={styles.subtitle}>
              <Text style={styles.subtitleItalic}>Reflection upon the Qur'an</Text>
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(200).duration(700)}
            style={styles.card}
          >
            <Text style={styles.heading}>
              {isSignup ? "Create Account" : "Welcome Back"}
            </Text>

            {isSignup && (
              <TextInput
                mode="outlined"
                label="Full Name"
                value={fullName}
                onChangeText={setFullName}
                style={styles.input}
                textColor="#FFFFFF"
                outlineColor="rgba(212, 175, 55, 0.3)"
                activeOutlineColor={colors.goldAccent}
                theme={{ roundness: 12, colors: { placeholder: '#6B7280' } }}
                left={<TextInput.Icon icon="account" color={colors.goldAccent} />}
                returnKeyType="next"
                blurOnSubmit={false}
              />
            )}

            <TextInput
              mode="outlined"
              label="Email"
              value={email}
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              style={styles.input}
              textColor="#FFFFFF"
              outlineColor="rgba(212, 175, 55, 0.3)"
              activeOutlineColor={colors.goldAccent}
              theme={{ roundness: 12, colors: { placeholder: '#6B7280' } }}
              left={<TextInput.Icon icon="email" color={colors.goldAccent} />}
              returnKeyType="next"
              blurOnSubmit={false}
            />

            <TextInput
              mode="outlined"
              label="Password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              textColor="#FFFFFF"
              outlineColor="rgba(212, 175, 55, 0.3)"
              activeOutlineColor={colors.goldAccent}
              theme={{ roundness: 12, colors: { placeholder: '#6B7280' } }}
              left={<TextInput.Icon icon="lock" color={colors.goldAccent} />}
              right={
                <TextInput.Icon
                  icon={showPassword ? "eye-off" : "eye"}
                  onPress={() => setShowPassword(!showPassword)}
                  color={colors.goldAccent}
                />
              }
              returnKeyType="done"
              onSubmitEditing={handleAuth}
            />

            <Button
              mode="contained"
              onPress={handleAuth}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={{ height: 55 }}
              labelStyle={styles.buttonLabel}
              icon={isSignup ? "account-plus" : "login"}
            >
              {isSignup ? "Create Account" : "Login"}
            </Button>

            <TouchableOpacity
              onPress={() => {
                setIsSignup(!isSignup);
                setPassword("");
                setFullName("");
                dismissKeyboard();
              }}
              style={styles.switchContainer}
            >
              <Text style={styles.switchText}>
                {isSignup
                  ? "Already have an account? "
                  : "Don't have an account? "}
              </Text>
              <Text style={styles.switchButton}>
                {isSignup ? "Login" : "Sign Up"}
              </Text>
            </TouchableOpacity>

            {loading && (
              <ActivityIndicator
                size="small"
                color={colors.goldAccent}
                style={{ marginTop: 20 }}
              />
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                By continuing you agree to our
              </Text>
              <Text style={styles.footerLink}> Privacy Policy </Text>
              <Text style={styles.footerText}>& Terms.</Text>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>

        <Modal
          animationType="fade"
          transparent={true}
          visible={showConfirmModal}
          onRequestClose={handleConfirmModalClose}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <LinearGradient
                colors={['#0F766E', '#115E59']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modalHeaderGradient}
              >
                <View style={styles.modalIconContainer}>
                  <Ionicons name="mail" size={40} color="#FFFFFF" />
                </View>
                <Text style={styles.modalTitle}>Confirm Your Email</Text>
              </LinearGradient>

              <View style={styles.modalBody}>
                <Text style={styles.modalMessage}>
                  We've sent a confirmation link to your email.
                </Text>
                <Text style={styles.modalMessage}>
                  Please check your inbox and click the link to verify your account.
                </Text>
                <Text style={styles.modalMessage}>
                  Then you can log in.
                </Text>

                <Button
                  mode="contained"
                  onPress={handleConfirmModalClose}
                  style={styles.modalButton}
                  labelStyle={styles.modalButtonLabel}
                  icon="login"
                >
                  Go to Login
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#1a2a2a", // ✅ solid color – removes transparent background
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: colors.goldAccent,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    borderWidth: 2,
    borderColor: colors.goldAccent,
    overflow: "hidden",
    position: "relative",
  },
  logoImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 2,
    marginBottom: 8,
    textShadowColor: colors.goldAccent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  dividerLine: {
    width: 60,
    height: 2,
    backgroundColor: colors.goldAccent,
    marginVertical: 6,
    borderRadius: 1,
  },
  subtitle: {
    textAlign: "center",
    color: "#B0B0B0",
    fontSize: 16,
    paddingHorizontal: 20,
    lineHeight: 24,
    fontWeight: "400",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  subtitleItalic: {
    fontStyle: "italic",
    color: colors.goldAccent,
    fontWeight: "500",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.15)",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  heading: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    marginBottom: 16,
    backgroundColor: "transparent",
  },
  button: {
    marginTop: 8,
    borderRadius: 18,
    backgroundColor: colors.primaryGreen,
  },
  buttonLabel: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  switchText: {
    color: "#B0B0B0",
    fontSize: 16,
  },
  switchButton: {
    color: colors.goldAccent,
    fontWeight: "700",
    fontSize: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 28,
  },
  footerText: {
    color: "#888888",
    fontSize: 13,
  },
  footerLink: {
    color: colors.goldAccent,
    fontWeight: "700",
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContainer: {
    backgroundColor: "#1a2a2a",
    borderRadius: 28,
    overflow: "hidden",
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeaderGradient: {
    paddingVertical: 30,
    alignItems: "center",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalBody: {
    padding: 24,
    paddingTop: 28,
  },
  modalMessage: {
    fontSize: 16,
    color: "#E0E0E0",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 6,
  },
  modalButton: {
    marginTop: 24,
    borderRadius: 18,
    backgroundColor: colors.primaryGreen,
  },
  modalButtonLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
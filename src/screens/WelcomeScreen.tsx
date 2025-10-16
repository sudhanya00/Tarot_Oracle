// src/screens/WelcomeScreen.tsx
import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";

const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const handleStart = () => navigation.replace("Login");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tarot Oracle</Text>

      <View style={styles.imageWrapper}>
        <Image
          source={require("../../assets/images/hooded_oracle.png")}
          style={styles.image}
          resizeMode="cover"
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleStart}>
        <Text style={styles.buttonText}>Get Futuristic</Text>
      </TouchableOpacity>

      <Text style={styles.tagline}>Let me take you to your Future</Text>
    </View>
  );
};

export default WelcomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  title: {
    marginTop: 50,
    color: "#7dd3fc",
    fontSize: 36,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 1,
  },
  imageWrapper: {
    marginTop: 30,
    height: 240,
    width: 240,
    borderRadius: 120,
    overflow: "hidden",
  },
  image: { height: "100%", width: "100%" },
  button: {
    backgroundColor: "#1e40af",
    borderRadius: 9999,
    paddingHorizontal: 30,
    paddingVertical: 14,
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  buttonText: { fontSize: 18, color: "#fff", fontWeight: "600" },
  tagline: {
    color: "#60a5fa",
    fontStyle: "italic",
    fontSize: 16,
    marginBottom: 30,
    textAlign: "center",
  },
});

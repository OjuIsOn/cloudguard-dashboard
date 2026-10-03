import crypto from "crypto";

// Ensure we have a 32-byte key
const getSecretKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be exactly 32 characters long.");
  }
  return Buffer.from(key, "utf-8");
};

const ALGORITHM = "aes-256-gcm";

export const encrypt = (text: string): { encryptedData: string; iv: string; authTag: string } => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getSecretKey(), iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return {
    encryptedData: encrypted,
    iv: iv.toString("hex"),
    authTag: authTag,
  };
};

export const decrypt = (encryptedData: string, iv: string, authTag: string): string => {
  const decipher = crypto.createDecipheriv(ALGORITHM, getSecretKey(), Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
};

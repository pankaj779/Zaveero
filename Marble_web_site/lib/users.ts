import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function ensureOwnerAccount() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return null;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "admin") {
      return prisma.user.update({
        where: { email },
        data: { role: "admin" },
      });
    }
    return existing;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: {
      name: "Devisingh Prajapathi",
      email,
      phone: "+91 9900984570",
      passwordHash,
      role: "admin",
    },
  });
}

export async function createUser(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
}) {
  const email = data.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("An account with this email already exists");
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (email === adminEmail) {
    throw new Error("This email is reserved for the owner account");
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  return prisma.user.create({
    data: {
      name: data.name.trim(),
      email,
      phone: data.phone.trim(),
      passwordHash,
      role: "client",
    },
  });
}

export async function verifyUser(email: string, password: string) {
  await ensureOwnerAccount();

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return user;
}

export async function updateUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  if (newPassword.length < 6) {
    throw new Error("New password must be at least 6 characters");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new Error("Current password is incorrect");

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

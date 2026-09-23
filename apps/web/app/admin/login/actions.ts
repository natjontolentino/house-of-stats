"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, computeSessionToken, COOKIE_NAME } from "../../../lib/adminSession";

export async function loginAction(formData: FormData) {
  const password = formData.get("password");
  if (typeof password !== "string" || !checkPassword(password)) {
    redirect("/admin/login?error=1");
  }

  const token = await computeSessionToken();
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  redirect("/admin");
}

export async function logoutAction() {
  cookies().delete(COOKIE_NAME);
  redirect("/admin/login");
}

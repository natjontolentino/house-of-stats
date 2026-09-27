"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, computeSessionToken, COOKIE_NAME } from "../../../lib/adminSession";
import { googleAdminConfigured } from "../../../lib/googleAdmin";

export async function loginAction(formData: FormData) {
  // Once Google sign-in is set up it is the only way in -- a server action can be
  // invoked directly, so hiding the form is not enough.
  if (googleAdminConfigured()) redirect("/admin/login?error=disabled");

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

import axios from "axios";

import { API_URL } from "./api";

/** The browser knows the user's zone; the server cannot guess it. */
export const browserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions()
      .timeZone;
  } catch {
    return "UTC";
  }
};

export const loginUser = async (
  email: string,
  password: string
) => {
  const response = await axios.post(
    `${API_URL}/auth/login`,
    {
      email,
      password,
    }
  );

  return response.data;
};

export const registerUser = async (
  name: string,
  email: string,
  password: string
) => {
  const response = await axios.post(
    `${API_URL}/auth/register`,
    {
      name,
      email,
      password,
      timezone: browserTimezone(),
    }
  );

  return response.data;
};

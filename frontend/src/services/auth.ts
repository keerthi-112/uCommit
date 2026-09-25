import axios from "axios";

import { API_URL } from "./api";

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
    }
  );

  return response.data;
};

import { Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../prisma/client";
import { generateToken } from "../utils/jwt";

export const register = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      name,
      email,
      password,
    } = req.body;

    const existingUser =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (existingUser) {
      return res.status(400).json({
        message:
          "Email already registered",
      });
    }

    const passwordHash =
      await bcrypt.hash(password, 10);

    const user =
      await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,

          wallet: {
            create: {},
          },
        },
      });

    const token = generateToken({
      userId: user.id,
      role: user.role,
    });

    return res.status(201).json({
  token,
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    trustScore: user.trustScore,
    consistencyScore: user.consistencyScore,
    createdAt: user.createdAt,
  },
});
  } catch (error) {
    return res.status(500).json({
      message: "Server Error",
    });
  }
};
  export const login = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      email,
      password,
    } = req.body;

    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const isPasswordValid =
      await bcrypt.compare(
        password,
        user.passwordHash
      );

    if (!isPasswordValid) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const token = generateToken({
      userId: user.id,
      role: user.role,
    });

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        trustScore: user.trustScore,
        consistencyScore:
          user.consistencyScore,
      },
    });
  } catch {
    return res.status(500).json({
      message: "Server Error",
    });
  }
};
export const me = async (
  req: Request & { userId?: string },
  res: Response
) => {
  try {
    const user =
  await prisma.user.findUnique({
    where: {
      id: (req as any).userId,
    },
    include: {
      wallet: true,
    },
  });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      user,
    });
  } catch {
    return res.status(500).json({
      message: "Server Error",
    });
  }
};
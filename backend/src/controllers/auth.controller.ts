import { Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../prisma/client";
import { generateToken } from "../utils/jwt";
import { isValidTimezone } from "../utils/time";

export const register = async (
  req: Request,
  res: Response
) => {
  try {
    const { name, password } = req.body;

    // Stored lowercase so the same address cannot become two accounts.
    const email =
      typeof req.body.email === "string"
        ? req.body.email
            .trim()
            .toLowerCase()
        : "";

    if (
      typeof name !== "string" ||
      name.trim().length < 2
    ) {
      return res.status(400).json({
        message: "Please enter your name",
      });
    }

    if (
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      return res.status(400).json({
        message:
          "Please enter a valid email address",
      });
    }

    if (
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters",
      });
    }

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
          name: name.trim(),
          email,
          passwordHash,

          // Sent by the browser so the user's day starts and ends where
          // they are. Anything unrecognised falls back to UTC.
          timezone: isValidTimezone(
            req.body?.timezone
          )
            ? req.body.timezone
            : "UTC",

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
    const { password } = req.body;

    // Matches how register stores it, so casing never blocks a sign in.
    const email =
      typeof req.body.email === "string"
        ? req.body.email
            .trim()
            .toLowerCase()
        : "";

    if (!email || !password) {
      return res.status(400).json({
        message:
          "Email and password are required",
      });
    }

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
    // Explicit select: never leak passwordHash to the client.
    const user =
      await prisma.user.findUnique({
        where: {
          id: (req as any).userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          timezone: true,
          trustScore: true,
          consistencyScore: true,
          createdAt: true,
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

/**
 * Records the caller's timezone.
 *
 * The browser knows it and the server cannot guess it, so the client
 * reports it after signing in. It decides where this user's day starts,
 * which is what makes "already submitted today" and the missed-day job
 * agree with what the user sees on their own calendar.
 */
export const updateTimezone = async (
  req: Request & { userId?: string },
  res: Response
) => {
  try {
    const timezone = req.body?.timezone;

    if (!isValidTimezone(timezone)) {
      return res.status(400).json({
        message:
          "A valid IANA timezone is required",
      });
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: { timezone },
    });

    return res.status(200).json({
      timezone,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

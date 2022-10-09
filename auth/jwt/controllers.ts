import { Request, Response } from "express";
import { User } from "@prisma/client";

import defaultConfig from "./defaults";
import userConfig from "../../configs/auth.config";
import { JwtOptions } from "../../types/auth";
import { wrappedResponse } from "../../utils/functions";
import {
  createJwtToken,
  makeUser,
  validateJwt,
  validateUser,
} from "../../services/user.service";

export const createRefreshToken = async (
  req: Request,
  res: Response<GlobalResponse<string | null>>
) => {
  const secret = (userConfig.JWT as JwtOptions).secret ?? defaultConfig.secret;
  const refreshExpire =
    (userConfig.JWT as JwtOptions).refreshExpire ?? defaultConfig.refreshExpire;

  if (!req.body.accessToken) {
    return wrappedResponse(res, "No access token in body", 400, null);
  }
  const accessToken = req.body.accessToken;

  const jwtResult = await validateJwt(accessToken, secret);

  if (!jwtResult.payload) {
    return wrappedResponse(res, jwtResult.message, 400, null);
  }

  if (!jwtResult.payload.type || jwtResult.payload.type !== "access") {
    return wrappedResponse(res, "Invalid Token", 400, null);
  }

  const token = createJwtToken(
    { id: jwtResult.payload.id, type: "refresh" },
    secret,
    refreshExpire
  );

  return wrappedResponse(res, "Token created successfully", 200, token);
};

export const login = async (
  req: Request,
  res: Response<
    GlobalResponse<{ accessToken: string; refreshToken: string } | null>
  >
) => {
  const secret = (userConfig.JWT as JwtOptions).secret ?? defaultConfig.secret;
  const refreshExpire =
    (userConfig.JWT as JwtOptions).refreshExpire ?? defaultConfig.refreshExpire;
  const accessExpire =
    (userConfig.JWT as JwtOptions).refreshExpire ?? defaultConfig.accessExpire;

  const validationResult = await validateUser(
    req.body.email,
    req.body.password
  );

  if (!validationResult.payload) {
    return wrappedResponse(res, validationResult.message, 400, null);
  }

  const accessToken = createJwtToken(
    { id: validationResult.payload.id, type: "access" },
    secret,
    accessExpire
  );
  const refreshToken = createJwtToken(
    { id: validationResult.payload.id, type: "refresh" },
    secret,
    refreshExpire
  );

  return wrappedResponse(res, "Login successful", 200, {
    accessToken,
    refreshToken,
  });
};

export const register = async (
  req: Request<Omit<User, "id">>,
  res: Response<GlobalResponse<null>>
) => {
  const userResult = await makeUser(req.body);

  if (!userResult.payload) {
    return wrappedResponse(res, userResult.message, 400, null);
  }

  return wrappedResponse(res, "User created successfully", 201, null);
};

import jwt from "jsonwebtoken";

export const auth = (request, response, next) => {
  try {
    const token = request.header("x-auth-token");
    jwt.verify(token, "my_secret_key");
    next();
  } catch (err) {
    response.send({ message: err.message });
  }
};

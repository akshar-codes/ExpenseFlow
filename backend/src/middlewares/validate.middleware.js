export const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    const data = source === "query" ? req.query : req.body;

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      allowUnknown: source === "query",
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((d) => d.message);

      return res.status(400).json({
        success: false,
        message: messages[0],
        errors: messages,
      });
    }

    // Write the transformed value back so controllers read clean data.
    if (source === "query") {
      Object.keys(req.query).forEach((key) => delete req.query[key]);
      Object.assign(req.query, value);
      req.validatedQuery = value; // backward-compat alias
    } else {
      req.body = value;
      req.validatedBody = value; // backward-compat alias
    }

    next();
  };

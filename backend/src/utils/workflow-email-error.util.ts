type NormalizedWorkflowEmailError = {
  code: string;
  userMessage: string;
  logMessage: string;
};

type AnyError = {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  responseCode?: unknown;
  command?: unknown;
};

const toSafeString = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  try {
    return String(value);
  } catch {
    return "";
  }
};

export const normalizeWorkflowEmailError = (error: unknown): NormalizedWorkflowEmailError => {
  const err = (error ?? {}) as AnyError;
  const name = toSafeString(err.name);
  const message = toSafeString(err.message);
  const code = toSafeString(err.code).toUpperCase();
  const command = toSafeString(err.command);
  const responseCode = typeof err.responseCode === "number" ? err.responseCode : undefined;

  // Template/render errors.
  if (message.includes("Email template not found:") || name.includes("Handlebars")) {
    return {
      code: "template_error",
      userMessage: "No se pudo generar la plantilla del correo automático.",
      logMessage: `Template/render error: ${message || name || "unknown"}`
    };
  }

  // Recipient issues (SMTP envelope / address).
  if (
    code === "EENVELOPE" ||
    code === "EADDR" ||
    code === "EADDRPARSE" ||
    code === "EINVALIDRECIPIENT" ||
    message.toLowerCase().includes("invalid recipient") ||
    message.toLowerCase().includes("invalid address") ||
    message.toLowerCase().includes("recipient address rejected")
  ) {
    return {
      code: "recipient_invalid",
      userMessage: "El correo del prospecto no parece válido.",
      logMessage: `Recipient rejected (${code || "unknown"}): ${message || "unknown"}`
    };
  }

  // SMTP authentication.
  if (
    code === "EAUTH" ||
    code === "EAUTHENTICATION" ||
    responseCode === 535 ||
    message.toLowerCase().includes("authentication") ||
    message.toLowerCase().includes("invalid login") ||
    message.toLowerCase().includes("username and password not accepted")
  ) {
    return {
      code: "smtp_auth",
      userMessage: "No se pudo autenticar con el servidor de correo. Revisa la configuración SMTP.",
      logMessage: `SMTP auth error (${code || responseCode || "unknown"}): ${message || "unknown"}`
    };
  }

  // Connectivity / DNS / refused.
  if (
    code === "ECONNECTION" ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "EHOSTUNREACH" ||
    code === "ENETUNREACH" ||
    message.toLowerCase().includes("connect") ||
    message.toLowerCase().includes("getaddrinfo")
  ) {
    return {
      code: "smtp_connection",
      userMessage: "No se pudo conectar con el servidor de correo. Intenta nuevamente más tarde.",
      logMessage: `SMTP connection error (${code || "unknown"}): ${message || "unknown"}`
    };
  }

  // Timeouts.
  if (
    code === "ETIMEDOUT" ||
    code === "ESOCKET" ||
    message.toLowerCase().includes("timeout") ||
    message.toLowerCase().includes("timed out")
  ) {
    return {
      code: "smtp_timeout",
      userMessage: "No se pudo conectar con el servidor de correo. Intenta nuevamente más tarde.",
      logMessage: `SMTP timeout (${code || "unknown"}): ${message || "unknown"}`
    };
  }

  // Generic nodemailer/SMTP command issues.
  if (command) {
    return {
      code: "smtp_error",
      userMessage: "No se pudo enviar el correo automático.",
      logMessage: `SMTP command error (${command}${code ? `/${code}` : ""}): ${message || "unknown"}`
    };
  }

  return {
    code: "unknown",
    userMessage: "No se pudo enviar el correo automático.",
    logMessage: `Unknown workflow email error (${code || "no_code"}): ${message || name || "unknown"}`
  };
};


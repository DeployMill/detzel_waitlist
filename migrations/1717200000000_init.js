export const up = (pgm) => {
  pgm.createTable("waitlist", {
    id: "id",
    email: { type: "text", notNull: true, unique: true },
    referrer: { type: "text" },
    user_agent: { type: "text" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });
};

export const down = (pgm) => {
  pgm.dropTable("waitlist");
};

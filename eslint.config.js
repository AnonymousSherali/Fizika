// Frontend kod tekshiruvi (ESLint): `npm run lint`. Sayt yig'ishsiz (oddiy <script>) ishlaydi —
// shuning uchun fayllar «script» rejimida tekshiriladi.
const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
    { ignores: ["backend/**", "node_modules/**", "**/*.min.js"] },
    js.configs.recommended,
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: "script",
            globals: {
                ...globals.browser,
                Fizika: "readonly",      // theme.js — umumiy yordamchilar
                FizikaAPI: "readonly",   // api.js
                FA: "readonly",          // app.js
                labNum: "readonly",      // model-tools.js — jurnal uchun son o'qish
            },
        },
        rules: {
            // HTML'dagi onclick="..." chaqiradigan funksiyalar «ishlatilmagan» bo'lib ko'rinadi
            "no-unused-vars": ["error", { vars: "local", args: "none", caughtErrors: "none" }],
            "no-empty": ["error", { allowEmptyCatch: true }],
        },
    },
    {
        // Mashq testi: savollar banki bank.js da, sahifa skripti uni ishlatadi
        files: ["testlar/testlar_online.js"],
        languageOptions: { globals: { questions: "readonly", problems: "readonly", TOPICS: "readonly" } },
    },
    {
        files: ["testlar/bank.js"],
        rules: { "no-unused-vars": "off" },   // ma'lumot fayli: o'zgaruvchilar boshqa skriptda ishlatiladi
    },
    {
        files: ["sw.js"],
        languageOptions: { globals: { ...globals.serviceworker } },
    },
    {
        files: ["eslint.config.js"],
        languageOptions: { sourceType: "commonjs", globals: { ...globals.node } },
    },
];

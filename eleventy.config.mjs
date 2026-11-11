export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/img");
  eleventyConfig.addPassthroughCopy("src/fonts");
  eleventyConfig.addPassthroughCopy({
    "node_modules/qrcode-generator/dist/qrcode.js": "js/qrcode.js",
  });
  eleventyConfig.addFilter("toJson", (v) => JSON.stringify(v));
  return { dir: { input: "src", output: "_site" } };
}
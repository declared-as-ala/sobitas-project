module.exports = {
  plugins: [
    require('autoprefixer'),
    require('@fullhuman/postcss-purgecss')({
      content: [
        './src/**/*.{html,ts}',  // Paths to your HTML and TypeScript files
      ],
      defaultExtractor: content => content.match(/[\w-/:]+(?=\s*[{;])/g) || [],
    })
  ]
};

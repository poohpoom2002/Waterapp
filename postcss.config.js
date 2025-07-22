import postcssNesting from 'postcss-nesting';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default {
  plugins: [
    postcssNesting,
    tailwindcss,
    autoprefixer,
  ],
}; 
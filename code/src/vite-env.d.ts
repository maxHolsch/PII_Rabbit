/// <reference types="vite/client" />

// Declare CSS modules with ?inline
declare module '*.css?inline' {
  const content: string;
  export default content;
}

// Declare regular CSS modules
declare module '*.css' {
  const content: string;
  export default content;
}

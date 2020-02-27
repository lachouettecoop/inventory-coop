function serverUrl() {
  if (process.env.NODE_ENV === 'production') {
    return '/api/v1';
  }
  return 'http://localhost:8000/api/v1';
}

export default serverUrl;

export function hostUrl() {
  if (process.env.NODE_ENV === 'production') {
    return '';
  }
  return 'http://localhost:8000';
}

export function apiUrl() {
  return `${hostUrl()}/api/v1`;
}

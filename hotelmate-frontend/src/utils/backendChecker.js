// Backend availability checker
export const checkBackendAvailability = async () => {
  const localBackend = "http://localhost:8000/api/";
  const prodBackend = "https://hotel-porter-d25ad83b12cf.herokuapp.com/api";
  
  
  // Test local backend first
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    await fetch(`${localBackend}health/`, { 
      signal: controller.signal,
      mode: 'cors'
    });
    
    clearTimeout(timeoutId);
    return { available: true, url: localBackend, type: 'local' };
  } catch (error) {
  }
  
  // Test production backend
  try {
    const response = await fetch(`${prodBackend}health/`, { 
      mode: 'no-cors' // This will at least tell us if the server responds
    });
    return { available: true, url: prodBackend, type: 'production', corsIssue: true };
  } catch (error) {
  }
  
  return { available: false, url: null, type: null };
};

export default checkBackendAvailability;

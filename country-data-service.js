// country-data-service.js
// Service to provide country and phone data using standard libraries

import { getCountries, getCountryCallingCode, isSupportedCountry } from 'libphonenumber-js';
import { countries, getCountryData, getEmojiFlag } from 'countries-list';

/**
 * Get all countries with phone codes and names
 * Returns array of { code, name, phoneCode, flag }
 */
export function getAllCountries() {
  const countryCodes = getCountries(); // Get all supported country codes from libphonenumber-js
  
  return countryCodes
    .map(code => {
      try {
        const phoneCode = getCountryCallingCode(code);
        const countryData = getCountryData(code);
        
        return {
          code: code,                    // ISO 3166-1 alpha-2 (e.g., 'US', 'GB')
          name: countryData?.name || code,  // Country name
          phoneCode: `+${phoneCode}`,  // Phone dialing code (e.g., '+1', '+44')
          flag: getEmojiFlag(code) || '🏳️', // Emoji flag
          nativeName: countryData?.native || countryData?.name || code,
          continent: countryData?.continent || 'Unknown'
        };
      } catch (e) {
        // Skip countries that might have issues
        return null;
      }
    })
    .filter(Boolean) // Remove null entries
    .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
}

/**
 * Get country by code
 */
export function getCountryByCode(code) {
  if (!isSupportedCountry(code)) return null;
  
  try {
    const phoneCode = getCountryCallingCode(code);
    const countryData = getCountryData(code);
    
    return {
      code,
      name: countryData?.name || code,
      phoneCode: `+${phoneCode}`,
      flag: getEmojiFlag(code) || '🏳️',
      nativeName: countryData?.native || countryData?.name || code,
      continent: countryData?.continent || 'Unknown',
      languages: countryData?.languages || [],
      currency: countryData?.currency || []
    };
  } catch (e) {
    return null;
  }
}

/**
 * Get phone code for a country
 */
export function getPhoneCode(countryCode) {
  try {
    return `+${getCountryCallingCode(countryCode)}`;
  } catch (e) {
    return null;
  }
}

/**
 * Validate phone number format
 */
export async function validatePhoneNumber(phoneNumber, countryCode) {
  try {
    const { parsePhoneNumber } = await import('libphonenumber-js');
    const phone = parsePhoneNumber(phoneNumber, countryCode);
    return phone?.isValid() || false;
  } catch (e) {
    return false;
  }
}

/**
 * Format phone number to E.164
 */
export async function formatPhoneNumberE164(phoneNumber, countryCode) {
  try {
    const { parsePhoneNumber } = await import('libphonenumber-js');
    const phone = parsePhoneNumber(phoneNumber, countryCode);
    return phone?.format('E.164') || phoneNumber;
  } catch (e) {
    return phoneNumber;
  }
}

/**
 * Get religions list (static data)
 */
export function getReligions() {
  return [
    { value: 'Islam', label: 'Islam ☪️', icon: '☪️' },
    { value: 'Christianity', label: 'Christianity ✝️', icon: '✝️' },
    { value: 'Judaism', label: 'Judaism ✡️', icon: '✡️' },
    { value: 'Hinduism', label: 'Hinduism 🕉️', icon: '🕉️' },
    { value: 'Buddhism', label: 'Buddhism ☸️', icon: '☸️' },
    { value: 'Sikhism', label: 'Sikhism 🪯', icon: '🪯' },
    { value: 'Atheist', label: 'Atheist ⚛️', icon: '⚛️' },
    { value: 'Agnostic', label: 'Agnostic ❓', icon: '❓' },
    { value: 'Other', label: 'Other 🌐', icon: '🌐' },
    { value: 'Prefer not to say', label: 'Prefer not to say 🤫', icon: '🤫' }
  ];
}

/**
 * Get countries grouped by continent
 */
export function getCountriesByContinent() {
  const allCountries = getAllCountries();
  const grouped = {};
  
  allCountries.forEach(country => {
    const continent = country.continent || 'Other';
    if (!grouped[continent]) {
      grouped[continent] = [];
    }
    grouped[continent].push(country);
  });
  
  return grouped;
}

/**
 * Search countries by name or code
 */
export function searchCountries(query) {
  const allCountries = getAllCountries();
  const lowerQuery = query.toLowerCase();
  
  return allCountries.filter(country => 
    country.name.toLowerCase().includes(lowerQuery) ||
    country.code.toLowerCase().includes(lowerQuery) ||
    country.phoneCode.includes(lowerQuery)
  );
}
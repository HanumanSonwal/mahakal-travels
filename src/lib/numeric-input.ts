export function cleanDecimalInput(value: string): string {
  let cleaned = value.replace(/[^\d.]/g, '');
  const decimal = cleaned.indexOf('.');
  if (decimal >= 0) cleaned = `${cleaned.slice(0, decimal + 1)}${cleaned.slice(decimal + 1).replace(/\./g, '')}`;
  const [whole = '', fraction] = cleaned.split('.');
  const normalizedWhole = whole.replace(/^0+(?=\d)/, '') || (fraction !== undefined ? '0' : '');
  return fraction === undefined ? normalizedWhole : `${normalizedWhole}.${fraction}`;
}

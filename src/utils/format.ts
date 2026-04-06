export const formatNumber = (value: number, decimals: number = 0): string => {
  return value.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

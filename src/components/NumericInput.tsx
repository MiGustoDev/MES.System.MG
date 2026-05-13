import { useState, useEffect } from 'react';

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export function NumericInput({ 
  value, 
  onChange, 
  onKeyDown, 
  onPaste, 
  className, 
  placeholder, 
  disabled,
  onFocus 
}: NumericInputProps) {
  const [inputValue, setInputValue] = useState(value === 0 ? '' : String(value).replace('.', ','));

  // Update internal state when external value changes (but not while typing)
  useEffect(() => {
    const parsedInput = parseFloat(inputValue.replace(',', '.')) || 0;
    if (parsedInput !== value) {
      setInputValue(value === 0 ? '' : String(value).replace('.', ','));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty, numbers, one comma or dot
    if (val === '' || /^-?\d*([.,]\d*)?$/.test(val)) {
      setInputValue(val);
      
      const numericVal = parseFloat(val.replace(',', '.')) || 0;
      onChange(numericVal);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={inputValue}
      onChange={handleChange}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      onFocus={onFocus}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}

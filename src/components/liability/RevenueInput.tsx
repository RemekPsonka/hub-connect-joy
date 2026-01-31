import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import type { Currency } from './types';
import { CURRENCY_LABELS, CURRENCY_SYMBOLS } from './types';

interface RevenueInputProps {
  value: number;
  currency: Currency;
  onChange: (value: number) => void;
  onCurrencyChange: (currency: Currency) => void;
}

function formatNumber(num: number): string {
  return num.toLocaleString('pl-PL');
}

function formatBigNumber(num: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B ${symbol}`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M ${symbol}`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(0)}K ${symbol}`;
  }
  return `${num} ${symbol}`;
}

export function RevenueInput({ value, currency, onChange, onCurrencyChange }: RevenueInputProps) {
  const [inputValue, setInputValue] = useState(formatNumber(value));

  useEffect(() => {
    setInputValue(formatNumber(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '');
    const num = parseInt(raw, 10) || 0;
    setInputValue(formatNumber(num));
    onChange(num);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-5 w-5 text-primary" />
          Całkowity przychód roczny
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <Label htmlFor="revenue" className="sr-only">Przychód</Label>
            <Input
              id="revenue"
              value={inputValue}
              onChange={handleChange}
              className="text-2xl font-bold h-14 text-right"
              placeholder="0"
            />
          </div>
          <div className="w-24">
            <Label htmlFor="currency" className="sr-only">Waluta</Label>
            <Select value={currency} onValueChange={(v) => onCurrencyChange(v as Currency)}>
              <SelectTrigger id="currency" className="h-14 text-lg font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CURRENCY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {value > 0 && (
          <div className="text-center">
            <span className="text-3xl font-bold text-primary">
              {formatBigNumber(value, currency)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { formatValuePLN } from './types';

interface ValueSliderProps {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
  showFluctuation?: boolean;
  hasFluctuation?: boolean;
  onFluctuationChange?: (checked: boolean) => void;
}

export function ValueSlider({
  label,
  value,
  max,
  onChange,
  showFluctuation = false,
  hasFluctuation = false,
  onFluctuationChange,
}: ValueSliderProps) {
  const [inputValue, setInputValue] = useState(String(value / 1_000_000));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setInputValue(String(value / 1_000_000));
    }
  }, [value, isEditing]);

  // Convert slider value (0-100) to actual value
  const sliderToValue = (sliderVal: number): number => {
    // Use quadratic scale for better UX with large ranges
    const percentage = sliderVal / 100;
    return Math.round(percentage * percentage * max);
  };

  // Convert actual value to slider value (0-100)
  const valueToSlider = (val: number): number => {
    return Math.sqrt(val / max) * 100;
  };

  const handleSliderChange = (values: number[]) => {
    const newValue = sliderToValue(values[0]);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    const numValue = parseFloat(inputValue.replace(',', '.'));
    if (!isNaN(numValue)) {
      const actualValue = Math.min(numValue * 1_000_000, max);
      onChange(Math.max(0, actualValue));
    } else {
      setInputValue(String(value / 1_000_000));
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };

  const percentage = (value / max) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium text-muted-foreground shrink-0">
          {label}
        </Label>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => setIsEditing(true)}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              className="w-20 h-7 text-right text-sm px-2"
            />
            <span className="text-xs text-muted-foreground">M</span>
          </div>
          {showFluctuation && onFluctuationChange && (
            <div className="flex items-center gap-1.5 ml-2">
              <Checkbox
                id={`fluctuation-${label}`}
                checked={hasFluctuation}
                onCheckedChange={(checked) => onFluctuationChange(!!checked)}
              />
              <Label 
                htmlFor={`fluctuation-${label}`}
                className="text-xs text-muted-foreground cursor-pointer"
              >
                Fluktuacja
              </Label>
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-1">
        <Slider
          value={[valueToSlider(value)]}
          onValueChange={handleSliderChange}
          max={100}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0</span>
          <span className="font-medium text-foreground">{formatValuePLN(value)}</span>
          <span>{formatValuePLN(max)}+</span>
        </div>
      </div>
      
      <Progress value={Math.min(percentage, 100)} className="h-1.5" />
    </div>
  );
}

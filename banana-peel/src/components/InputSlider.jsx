import { useContext } from 'react';
import { FormContext } from '../contexts/FormContext';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Slider from '@mui/material/Slider';
import MuiInput from '@mui/material/Input';

const Input = styled(MuiInput)`
  width: 42px;
`;

export default function InputSlider({ name }) {
  const { form, setForm } = useContext(FormContext);
  const entry = form[name];

  const handleSliderChange = (event, newValue) => {
    setForm({ ...form, [name]: { ...entry, value: newValue } });
  };

  const handleInputChange = (event) => {
    let newValue = event.target.value === '' ? 0 : Number(event.target.value);
    if (entry.type === 'integer') {
      newValue = Math.round(newValue);
    }
    setForm({ ...form, [name]: { ...entry, value: newValue } });
  };

  const handleBlur = () => {
    let newValue = entry.value;
    if (newValue < entry.min) {
      newValue = entry.min;
    } else if (newValue > entry.max) {
      newValue = entry.max;
    }
    setForm({ ...form, [name]: { ...entry, value: newValue } });
  };

  return (
    <Box sx={{ width: 300 }}>
      <Typography id="input-slider" gutterBottom>
        {name}
      </Typography>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs>
          <Slider
            value={entry.value}
            onChange={handleSliderChange}
            aria-labelledby="input-slider"
            step={entry.type === 'float' ? entry.step : 1}
            min={entry.min}
            max={entry.max}
            scale={entry.type === 'float' ? (x) => x : undefined}
          />
        </Grid>
        <Grid item>
          <Input
            value={entry.value}
            size="small"
            onChange={handleInputChange}
            onBlur={handleBlur}
            inputProps={{
              step: entry.step,
              min: entry.min,
              max: entry.max,
              type: 'number',
              'aria-labelledby': 'input-slider',
            }}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
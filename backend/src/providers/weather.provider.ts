// Weather Provider abstraction
// Replace DevelopmentWeatherProvider with a real API implementation (e.g. OpenWeatherMap)

export interface WeatherConditions {
  temperature: number;
  humidity: number;
  heatIndex: number;
  description: string;
  windSpeed: number;
  timestamp: string;
  source: string;
}

export interface WeatherForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  humidity: number;
  description: string;
}

export interface HeatRiskAssessment {
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  heatIndex: number;
  recommendations: string[];
}

export interface WeatherProvider {
  getCurrentConditions(location?: string): Promise<WeatherConditions>;
  getForecast(location?: string, days?: number): Promise<WeatherForecast[]>;
  getHeatRisk(temperature: number, humidity: number): HeatRiskAssessment;
}

// ─── Development implementation ───────────────────────────────────────────────

export class DevelopmentWeatherProvider implements WeatherProvider {
  async getCurrentConditions(_location?: string): Promise<WeatherConditions> {
    const temp = 42 + Math.round((Math.random() - 0.5) * 6);
    const humidity = 25 + Math.round(Math.random() * 20);
    return {
      temperature: temp,
      humidity,
      heatIndex: this.calcHeatIndex(temp, humidity),
      description: 'Sunny, Extreme Heat',
      windSpeed: 8 + Math.round(Math.random() * 10),
      timestamp: new Date().toISOString(),
      source: 'Development weather data — not real sensor/API data',
    };
  }

  async getForecast(_location?: string, days = 7): Promise<WeatherForecast[]> {
    return Array.from({ length: days }, (_, i) => {
      const maxTemp = 40 + Math.round(Math.random() * 8);
      const minTemp = 28 + Math.round(Math.random() * 5);
      const humidity = 20 + Math.round(Math.random() * 25);
      const date = new Date(Date.now() + i * 86400000).toISOString().split('T')[0];
      return { date, maxTemp, minTemp, humidity, description: 'Sunny/Partly Cloudy' };
    });
  }

  getHeatRisk(temperature: number, humidity: number): HeatRiskAssessment {
    const hi = this.calcHeatIndex(temperature, humidity);
    if (hi < 27) return { level: 'LOW', heatIndex: hi, recommendations: ['Normal precautions'] };
    if (hi < 33) return {
      level: 'MODERATE', heatIndex: hi,
      recommendations: ['Drink water every 30 min', 'Take breaks in shade'],
    };
    if (hi < 41) return {
      level: 'HIGH', heatIndex: hi,
      recommendations: ['Drink water every 20 min', 'Take 10 min shade break every hour', 'Wear light clothing'],
    };
    return {
      level: 'EXTREME', heatIndex: hi,
      recommendations: ['Avoid outdoor work if possible', 'Immediate shade if dizzy', 'Emergency: call 108'],
    };
  }

  private calcHeatIndex(t: number, rh: number): number {
    // Simplified Steadman heat-index formula
    return -8.78469475556 +
      1.61139411 * t +
      2.33854883889 * rh +
      -0.14611605 * t * rh +
      -0.012308094 * t * t +
      -0.0164248277778 * rh * rh +
      0.002211732 * t * t * rh +
      0.00072546 * t * rh * rh +
      -0.000003582 * t * t * rh * rh;
  }
}

export const weatherProvider: WeatherProvider = new DevelopmentWeatherProvider();

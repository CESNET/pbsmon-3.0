import { registerAs } from '@nestjs/config';
import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AppConfig, getAppConfig } from './app.config';
import { PrometheusConfig, getPrometheusConfig } from './prometheus.config';
import { PerunConfig, getPerunConfig } from './perun.config';
import { PbsConfig, getPbsConfig } from './pbs.config';
import { AccountingConfig, getAccountingConfig } from './accounting.config';
import { OidcConfig, getOidcConfig } from './oidc.config';
import { SeptikConfig, getSeptikConfig } from './septik.config';

function validate<T extends object>(
  config: T,
  configClass: new () => T,
  configName: string,
): T {
  const validatedConfig = plainToInstance(configClass, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `${configName} configuration validation failed: ${errors.toString()}`,
    );
  }

  return validatedConfig;
}

export default registerAs('app', () => {
  const config = getAppConfig();
  return validate(config, AppConfig, 'App');
});

export const prometheusConfig = registerAs('prometheus', () => {
  const config = getPrometheusConfig();
  return validate(config, PrometheusConfig, 'Prometheus');
});

export const perunConfig = registerAs('perun', () => {
  const config = getPerunConfig();
  return validate(config, PerunConfig, 'Perun');
});

export const pbsConfig = registerAs('pbs', () => {
  const config = getPbsConfig();
  return validate(config, PbsConfig, 'PBS');
});

export const accountingConfig = registerAs('accounting', () => {
  const config = getAccountingConfig();
  return validate(config, AccountingConfig, 'Accounting');
});

export const oidcConfig = registerAs('oidc', () => {
  const config = getOidcConfig();
  return validate(config, OidcConfig, 'OIDC');
});

export const septikConfig = registerAs('septik', () => {
  const config = getSeptikConfig();
  return validate(config, SeptikConfig, 'Septik');
});

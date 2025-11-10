type TemplateType = 'success' | 'failure';

import { HttpStatus, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class HbsService {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {
    this.initializeHandlebars();
  }

  private initializeHandlebars() {
    try {
      handlebars.registerHelper('eq', function (a, b) {
        return a === b;
      });

      // Register verification partials
      const successPartialPath = path.join(
        process.cwd(),
        'src/common/views/partials/success-verification.hbs'
      );
      const failurePartialPath = path.join(
        process.cwd(),
        'src/common/views/partials/failure-verification.hbs'
      );

      const successPartialContent = fs.readFileSync(successPartialPath, 'utf8');
      const failurePartialContent = fs.readFileSync(failurePartialPath, 'utf8');

      handlebars.registerPartial('success-verification', successPartialContent);
      handlebars.registerPartial('failure-verification', failurePartialContent);

      // Register email partials (Brevo)
      const emailOtpPartialPath = path.join(
        process.cwd(),
        'src/common/views/partials/email-otp.hbs'
      );
      const emailWelcomePartialPath = path.join(
        process.cwd(),
        'src/common/views/partials/email-welcome.hbs'
      );
      const emailVerificationPartialPath = path.join(
        process.cwd(),
        'src/common/views/partials/email-link-verification.hbs'
      );

      const emailOtpPartialContent = fs.readFileSync(emailOtpPartialPath, 'utf8');
      const emailWelcomePartialContent = fs.readFileSync(emailWelcomePartialPath, 'utf8');
      const emailVerificationPartialContent = fs.readFileSync(emailVerificationPartialPath, 'utf8');

      handlebars.registerPartial('email-otp', emailOtpPartialContent);
      handlebars.registerPartial('email-welcome', emailWelcomePartialContent);
      handlebars.registerPartial('email-link-verification', emailVerificationPartialContent);
    } catch (error) {
      this.logger.error(error, {
        location: 'initializeHandlebars',
        context: 'HbsService',
      });
      throw new InternalServerErrorException('Failed to initialize Handlebars');
    }
  }

  public renderTemplate(
    templateName: string,
    templateType: TemplateType,
    context: Record<string, string>
  ): { html: string; statusCode: number } {
    try {
      const templatePath = path.join(
        process.cwd(),
        `src/common/views/templates/${templateName}.hbs`
      );
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      const template = handlebars.compile(templateContent);

      const templateContext = {
        ...context,
        templateType,
      };

      const statusCode = this.getStatusCode(templateType, context);

      return {
        html: template(templateContext),
        statusCode,
      };
    } catch (error) {
      this.logger.error(error, {
        location: 'renderTemplate',
        context: 'HbsService',
      });
      throw new InternalServerErrorException('Failed to render template');
    }
  }

  public renderVerificationTemplate(
    templateType: TemplateType,
    context: Record<string, string>
  ): { html: string; statusCode: number } {
    return this.renderTemplate('success', templateType, context);
  }

  /**
   * Render email template for Brevo email sending
   */
  public renderBrevoTemplate(
    templateName: string,
    context: Record<string, string | number | Record<string, string>>
  ): string {
    try {
      const templatePath = path.join(process.cwd(), 'src/common/views/templates/email.hbs');
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      const template = handlebars.compile(templateContent);

      const templateContext = {
        ...context,
        templateName,
      };

      return template(templateContext);
    } catch (error) {
      this.logger.error(error, {
        location: 'renderEmailTemplate',
        context: 'HbsService',
      });
      throw new InternalServerErrorException('Failed to render email template');
    }
  }

  private getStatusCode(templateType: TemplateType, context: Record<string, string>): number {
    let statusCode = HttpStatus.OK;
    if (templateType === 'failure')
      if (
        context.errorMessage.includes('Invalid verification token') ||
        context.errorMessage.includes('expired')
      )
        statusCode = HttpStatus.UNAUTHORIZED;
      else if (context.errorMessage.includes('not found')) statusCode = HttpStatus.NOT_FOUND;
      else statusCode = HttpStatus.BAD_REQUEST;

    return statusCode;
  }
}

import type { ParsedArgs } from '../lib/types';
import {
  assertNoExtraPositionals,
  getBooleanOption,
  hasHelpFlag,
  parseEnvironment,
  parseJsonOrFile,
  requireOption,
  requirePositional,
} from '../lib/args';
import { fail } from '../lib/errors';
import { requestJson } from '../lib/http';
import { printOutput } from '../lib/output';

export async function handleScreenerCommand(subcommand: string | undefined, parsed: ParsedArgs): Promise<void> {
  if (!subcommand || hasHelpFlag(parsed) || subcommand === 'help' || subcommand === '--help' || subcommand === '-h') {
    printScreenerHelp();
    return;
  }

  const env = parseEnvironment(parsed);

  switch (subcommand) {
    case 'list': {
      const projectId = requirePositional(parsed, 0, '<projectId>');
      assertNoExtraPositionals(parsed, 1);

      const data = await requestJson({
        env,
        method: 'GET',
        path: `/api/projects/${encodeURIComponent(projectId)}/screeners`,
      });
      printOutput(data, parsed);
      return;
    }

    case 'create': {
      const projectId = requirePositional(parsed, 0, '<projectId>');
      assertNoExtraPositionals(parsed, 1);

      const title = requireOption(parsed, 'title');
      const body: Record<string, unknown> = { title };

      // Optional string fields
      for (const field of ['description', 'welcome-message', 'consent-text', 'brand-color', 'incentive-type', 'incentive-description']) {
        const key = field.replace(/-/g, '_');
        const val = parsed.options[field];
        if (val && val !== 'true') {
          body[key] = val;
        }
      }

      // Optional number fields
      if (parsed.options['max-participants'] && parsed.options['max-participants'] !== 'true') {
        body.max_participants = parseInt(parsed.options['max-participants'], 10);
      }
      if (parsed.options['incentive-value-cents'] && parsed.options['incentive-value-cents'] !== 'true') {
        body.incentive_value_cents = parseInt(parsed.options['incentive-value-cents'], 10);
      }

      // Questions: --questions <json|@file>
      const questionsInput = parsed.options.questions;
      if (questionsInput && questionsInput !== 'true') {
        body.questions = await parseJsonOrFile(questionsInput, '--questions');
      }

      const data = await requestJson({
        env,
        method: 'POST',
        path: `/api/projects/${encodeURIComponent(projectId)}/screeners`,
        body,
      });

      // Auto-activate if --activate flag is set
      if (getBooleanOption(parsed, 'activate')) {
        const screener = (data as Record<string, unknown>).screener as Record<string, unknown> | undefined;
        if (screener?.id) {
          await requestJson({
            env,
            method: 'PATCH',
            path: `/api/projects/${encodeURIComponent(projectId)}/screeners/${encodeURIComponent(screener.id as string)}`,
            body: { status: 'active' },
          });
          (screener as Record<string, unknown>).status = 'active';
        }
      }

      printOutput(data, parsed);

      // Print the public URL for convenience
      if (!parsed.options.json) {
        const screener = (data as Record<string, unknown>).screener as Record<string, unknown> | undefined;
        if (screener?.id) {
          console.log('\n--- Next steps ---');
          console.log(`Get your project public key:  npm run cli project get ${projectId} --env ${env} --json`);
          console.log(`Public URL:                   https://usertests-stage.krasnoperov.me/u/screener/${screener.id}?key=<PUBLIC_KEY>`);
          if (!getBooleanOption(parsed, 'activate')) {
            console.log(`Activate screener:            npm run cli screener activate ${projectId} ${screener.id} --env ${env}`);
          }
        }
      }
      return;
    }

    case 'get': {
      const projectId = requirePositional(parsed, 0, '<projectId>');
      const screenerId = requirePositional(parsed, 1, '<screenerId>');
      assertNoExtraPositionals(parsed, 2);

      const data = await requestJson({
        env,
        method: 'GET',
        path: `/api/projects/${encodeURIComponent(projectId)}/screeners/${encodeURIComponent(screenerId)}`,
      });
      printOutput(data, parsed);
      return;
    }

    case 'activate': {
      const projectId = requirePositional(parsed, 0, '<projectId>');
      const screenerId = requirePositional(parsed, 1, '<screenerId>');
      assertNoExtraPositionals(parsed, 2);

      const data = await requestJson({
        env,
        method: 'PATCH',
        path: `/api/projects/${encodeURIComponent(projectId)}/screeners/${encodeURIComponent(screenerId)}`,
        body: { status: 'active' },
      });
      printOutput(data, parsed);
      return;
    }

    case 'deactivate': {
      const projectId = requirePositional(parsed, 0, '<projectId>');
      const screenerId = requirePositional(parsed, 1, '<screenerId>');
      assertNoExtraPositionals(parsed, 2);

      const data = await requestJson({
        env,
        method: 'PATCH',
        path: `/api/projects/${encodeURIComponent(projectId)}/screeners/${encodeURIComponent(screenerId)}`,
        body: { status: 'inactive' },
      });
      printOutput(data, parsed);
      return;
    }

    case 'update': {
      const projectId = requirePositional(parsed, 0, '<projectId>');
      const screenerId = requirePositional(parsed, 1, '<screenerId>');
      assertNoExtraPositionals(parsed, 2);

      const body: Record<string, unknown> = {};

      for (const field of ['title', 'description', 'status', 'welcome-message', 'thank-you-message', 'disqualified-message', 'brand-color', 'consent-text']) {
        const key = field.replace(/-/g, '_');
        const val = parsed.options[field];
        if (val && val !== 'true') {
          body[key] = val;
        }
      }

      if (parsed.options['max-participants'] && parsed.options['max-participants'] !== 'true') {
        body.max_participants = parseInt(parsed.options['max-participants'], 10);
      }

      if (Object.keys(body).length === 0) {
        fail('No update fields provided. Use --title, --description, --status, --welcome-message, etc.');
      }

      const data = await requestJson({
        env,
        method: 'PATCH',
        path: `/api/projects/${encodeURIComponent(projectId)}/screeners/${encodeURIComponent(screenerId)}`,
        body,
      });
      printOutput(data, parsed);
      return;
    }

    case 'add-question': {
      const projectId = requirePositional(parsed, 0, '<projectId>');
      const screenerId = requirePositional(parsed, 1, '<screenerId>');
      assertNoExtraPositionals(parsed, 2);

      const questionText = requireOption(parsed, 'text');
      const questionType = parsed.options.type || 'text';

      const body: Record<string, unknown> = {
        question_text: questionText,
        question_type: questionType,
        required: getBooleanOption(parsed, 'required'),
      };

      // Options for single/multiple choice
      if (parsed.options.options && parsed.options.options !== 'true') {
        body.options = JSON.parse(parsed.options.options);
      }

      // Qualification rules
      if (parsed.options.rules && parsed.options.rules !== 'true') {
        body.qualification_rules = JSON.parse(parsed.options.rules);
      }

      // Number min/max
      if (parsed.options.min && parsed.options.min !== 'true') {
        body.min_value = parseInt(parsed.options.min, 10);
      }
      if (parsed.options.max && parsed.options.max !== 'true') {
        body.max_value = parseInt(parsed.options.max, 10);
      }

      const data = await requestJson({
        env,
        method: 'POST',
        path: `/api/projects/${encodeURIComponent(projectId)}/screeners/${encodeURIComponent(screenerId)}/questions`,
        body,
      });
      printOutput(data, parsed);
      return;
    }

    case 'url': {
      const projectId = requirePositional(parsed, 0, '<projectId>');
      const screenerId = requirePositional(parsed, 1, '<screenerId>');
      assertNoExtraPositionals(parsed, 2);

      // Fetch project to get the public key
      const projectData = await requestJson({
        env,
        method: 'GET',
        path: `/api/projects/${encodeURIComponent(projectId)}`,
      }) as Record<string, unknown>;

      const project = projectData.project as Record<string, unknown> | undefined;
      const publicKey = project?.public_key as string | undefined;

      if (!publicKey) {
        fail('Could not retrieve project public key');
      }

      const baseUrl = env === 'production'
        ? 'https://usertests.krasnoperov.me'
        : 'https://usertests-stage.krasnoperov.me';

      const url = `${baseUrl}/u/screener/${screenerId}?key=${encodeURIComponent(publicKey)}`;

      if (parsed.options.json === 'true') {
        console.log(JSON.stringify({ url, screener_id: screenerId, public_key: publicKey }));
      } else {
        console.log(url);
      }
      return;
    }

    case 'respond': {
      const screenerId = requirePositional(parsed, 0, '<screenerId>');
      assertNoExtraPositionals(parsed, 1);

      const key = requireOption(parsed, 'key');
      const answersInput = requireOption(parsed, 'answers');
      const answers = await parseJsonOrFile(answersInput, '--answers');

      const payload: Record<string, unknown> = {
        answers,
        consent_given: true,
        consent_recording: true,
        consent_analytics: true,
        consent_followup: true,
      };

      if (parsed.options.name && parsed.options.name !== 'true') {
        payload.participant_name = parsed.options.name;
      }

      if (parsed.options.email && parsed.options.email !== 'true') {
        payload.participant_email = parsed.options.email;
      }

      const data = await requestJson({
        env,
        method: 'POST',
        path: `/api/sdk/screener/${encodeURIComponent(screenerId)}/respond`,
        authMode: 'none',
        projectKey: key,
        body: payload,
      });
      printOutput(data, parsed);
      return;
    }

    default:
      fail(`Unknown screener command: ${subcommand}`);
  }
}

export function printScreenerHelp(): void {
  console.log(`
Usage:
  npm run cli screener <command> [options]

Commands:
  list <projectId>
  create <projectId> --title <title> [options]
  get <projectId> <screenerId>
  update <projectId> <screenerId> [--title ...] [--status active|inactive]
  activate <projectId> <screenerId>
  deactivate <projectId> <screenerId>
  add-question <projectId> <screenerId> --text <text> [--type single_choice] [--options '["a","b"]'] [--rules '{"qualify":["a"]}'] [--required]
  url <projectId> <screenerId>           Print public screener URL
  respond <screenerId> --key <publicKey> --answers <json|@file>

Create options:
  --title <title>                        Screener title (required)
  --description <text>                   Description shown to participants
  --welcome-message <text>               Welcome message at top of screener
  --consent-text <text>                  Consent checkbox text
  --brand-color <hex>                    Brand color (e.g. #4F46E5)
  --max-participants <n>                 Max qualified participants
  --incentive-type <type>                e.g. gift_card, product_credit
  --incentive-description <text>         e.g. "$20 Amazon gift card"
  --incentive-value-cents <n>            Value in cents
  --questions <json|@file>               Questions array (JSON or @filename)
  --activate                             Set status to active immediately

Question JSON format:
  [
    {
      "question_text": "How often do you use the product?",
      "question_type": "single_choice",
      "required": true,
      "options": ["Daily", "Weekly", "Monthly", "Rarely"],
      "qualification_rules": { "qualify": ["Daily", "Weekly"] }
    }
  ]

General options:
  --env <env>                stage | production | local
  --json                     JSON output

Examples:
  npm run cli screener create proj_123 --title "Power User Study" --activate --questions @screener.json
  npm run cli screener url proj_123 scr_456
  npm run cli screener activate proj_123 scr_456
  npm run cli screener add-question proj_123 scr_456 --text "Role?" --type single_choice --options '["Engineer","PM","Designer"]' --required
  npm run cli screener respond scr_123 --key ut_pub_xxx --answers '{"q1":"Daily"}'
`);
}

import { validateAllConfiguration } from "../src/config/loader";

async function main() {
  try {
    const configuration = await validateAllConfiguration();
    console.log(
      `Configuration valid: ${configuration.pages.length} page(s), ${configuration.dashboard.widgets.length} dashboard widget(s).`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

void main();

import chalk from 'chalk'

export class Logger {
  private static verbose = false

  static setVerbose(verbose: boolean) {
    Logger.verbose = verbose
  }

  static info(message: string) {
    console.log(chalk.blue('ℹ'), message)
  }

  static success(message: string) {
    console.log(chalk.green('✓'), message)
  }

  static warning(message: string) {
    console.log(chalk.yellow('⚠'), message)
  }

  static error(message: string) {
    console.log(chalk.red('✗'), message)
  }

  static debug(message: string) {
    if (Logger.verbose) {
      console.log(chalk.gray('🔍'), chalk.gray(message))
    }
  }

  static log(message: string) {
    console.log(message)
  }

  static header(message: string) {
    console.log(chalk.bold.cyan(message))
  }

  static dim(message: string) {
    console.log(chalk.dim(message))
  }
}

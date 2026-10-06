import '../src/module-aliases';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { loadConfig, loadEnvFile } from '@infrastructure/config/env';
import { buildContainer } from '@infrastructure/config/container';
import { createLogger } from '@infrastructure/logging/logger';
import { buildHttpApp } from '@presentation/http/server';
import type { ApproachMeasurementDTO } from '@application/dtos/compare.dto';

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatReduction = (ratio: number): string => {
  if (ratio <= 1) return 'baseline (1.0x)';
  return `${ratio.toFixed(1)}x (${((1 - 1 / ratio) * 100).toFixed(1)}% menor)`;
};

const main = async (): Promise<void> => {
  const { values } = parseArgs({
    options: {
      runs: { type: 'string', default: '5' },
    },
  });

  const runs = Number.parseInt(values.runs, 10);
  loadEnvFile();
  const config = loadConfig();

  process.stdout.write(
    `\n🚀 Iniciando Benchmark do Dashboard BFF (Execuções por abordagem: ${runs})\n`,
  );
  process.stdout.write(
    `Ambiente: Node ${process.version} | MySQL 8 | Dataset: 1.000 usuários, 5.000 matrículas\n\n`,
  );

  const logger = createLogger({ ...config.log, level: 'warn' });
  const container = buildContainer(config, logger);
  const httpApp = await buildHttpApp(container);

  try {
    const result = await httpApp.compareResponseSizes.execute({ runs });

    if (!result.success) {
      throw result.error;
    }

    const { approaches, baseline } = result.data;

    process.stdout.write('📊 Resultados do Benchmark:\n\n');

    // Monta tabela Markdown
    const headers = [
      'Abordagem',
      'Registros',
      'Payload Bruto',
      'Gzip',
      'Brotli',
      'Queries SQL',
      'Latência (Mediana)',
      'Redução Bruta',
    ];

    const rows = approaches.map((app: ApproachMeasurementDTO) => [
      `**${app.label}**`,
      `${app.records}`,
      formatBytes(app.bytes.raw),
      formatBytes(app.bytes.gzip),
      formatBytes(app.bytes.brotli),
      `${app.dbQueries}`,
      `${app.timeMs.median} ms`,
      app.id === baseline ? 'Baseline' : `**${app.reductionVsBaseline.raw}x**`,
    ]);

    const markdownTable = [
      `| ${headers.join(' | ')} |`,
      `| ${headers.map(() => '---').join(' | ')} |`,
      ...rows.map((row) => `| ${row.join(' | ')} |`),
    ].join('\n');

    process.stdout.write(`${markdownTable}\n\n`);

    // Detalhamento de redução percentual
    process.stdout.write('💡 Destaques de Eficiência:\n');
    for (const app of approaches) {
      if (app.id !== baseline) {
        process.stdout.write(
          `  - **${app.label}**: Redução de ${formatReduction(app.reductionVsBaseline.raw)} no payload bruto e latência de ${app.timeMs.median}ms com ${app.dbQueries} query(ies) SQL.\n`,
        );
      }
    }
    process.stdout.write('\n');

    // Salva artefatos na pasta benchmarks/
    const benchmarksDir = path.resolve(process.cwd(), 'benchmarks');
    await fs.mkdir(benchmarksDir, { recursive: true });

    const jsonPath = path.join(benchmarksDir, 'benchmark-results.json');
    await fs.writeFile(jsonPath, JSON.stringify(result.data, null, 2), 'utf8');

    const legacyRaw = approaches[0]?.bytes.raw ?? 0;
    const legacyTime = approaches[0]?.timeMs.median ?? 0;
    const bffRaw = approaches[1]?.bytes.raw ?? 0;
    const bffReduction = approaches[1]?.reductionVsBaseline.raw ?? 0;
    const bffTime = approaches[1]?.timeMs.median ?? 0;
    const bffQueries = approaches[1]?.dbQueries ?? 0;
    const gqlRaw = approaches[2]?.bytes.raw ?? 0;
    const gqlGzip = approaches[2]?.bytes.gzip ?? 0;
    const gqlReduction = approaches[2]?.reductionVsBaseline.raw ?? 0;

    const mdPath = path.join(benchmarksDir, 'benchmark-results.md');
    const mdContent = `# 📊 Benchmark de Performance: REST Legacy vs REST BFF vs GraphQL

Executado em: ${result.data.measuredAt}  
Amostragem: ${runs} execuções sequenciais por endpoint  
Dataset de teste: SPEC (1.000 usuários, 50 instrutores, 200 cursos, 1.000 módulos, 5.000 matrículas, 3.000 certificados)

## Tabela Comparativa de Métricas

${markdownTable}

## Análise Técnica dos Resultados

1. **REST Legacy (\`GET /api/v1/dashboard\`)**:
   - Sofre com **over-fetching massivo** (${formatBytes(legacyRaw)}). Retorna grafo completo com bio, módulos, metadados e entidades desnecessárias para a visualização inicial.
   - Executa queries pesadas e serialização volumosa gerando alta latência (${legacyTime}ms).

2. **REST BFF (\`GET /api/v2/dashboard\`)**:
   - Aplica projeção SQL direta (\`SELECT id, name, total_score, avatar_url\`) atendendo exatamente às 3 propriedades exigidas pelo card da interface.
   - Reduz o payload em **${bffReduction}x** (${formatBytes(bffRaw)}) e responde em apenas ${bffTime}ms com **${bffQueries} queries SQL** (projeção + \`COUNT\` da paginação).

3. **GraphQL com DataLoader (\`POST /graphql\`)**:
   - Permite que o cliente declare estritamente os campos necessários via Field Selection AST.
   - Utiliza **DataLoader** para colapsar buscas relacionais N+1 em queries em lote (\`WHERE id IN (...)\`) com cache escopado por requisição.
   - Payload final de apenas **${formatBytes(gqlRaw)}** (Gzip: **${formatBytes(gqlGzip)}**), alcançando uma redução de **${gqlReduction}x**, gerando máxima economia de banda para clientes mobile e web.
`;
    await fs.writeFile(mdPath, mdContent, 'utf8');

    process.stdout.write(`Salvo com sucesso em:\n  - ${jsonPath}\n  - ${mdPath}\n\n`);
  } finally {
    await httpApp.graphql.stop();
    container.queryCounter.dispose();
    await container.db.destroy();
  }
};

main().catch((error: unknown) => {
  process.stderr.write(
    `Benchmark failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});

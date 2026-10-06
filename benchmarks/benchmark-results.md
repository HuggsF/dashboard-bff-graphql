# 📊 Benchmark de Performance: REST Legacy vs REST BFF vs GraphQL

Executado em: 2026-10-06T01:41:32.353Z  
Amostragem: 5 execuções sequenciais por endpoint  
Dataset de teste: SPEC (1.000 usuários, 50 instrutores, 200 cursos, 1.000 módulos, 5.000 matrículas, 3.000 certificados)

## Tabela Comparativa de Métricas

| Abordagem | Registros | Payload Bruto | Gzip | Brotli | Queries SQL | Latência (Mediana) | Redução Bruta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **REST Legacy (v1)** | 1000 | 8.99 MB | 2.57 MB | 540.0 KB | 6 | 54.4 ms | Baseline |
| **REST BFF (v2)** | 20 | 2.6 KB | 974 B | 943 B | 2 | 5.6 ms | **3541.9x** |
| **GraphQL (v3)** | 20 | 2.8 KB | 1.0 KB | 1.0 KB | 1 | 6.1 ms | **3249x** |

## Análise Técnica dos Resultados

1. **REST Legacy (`GET /api/v1/dashboard`)**:
   - Sofre com **over-fetching massivo** (8.99 MB). Retorna grafo completo com bio, módulos, metadados e entidades desnecessárias para a visualização inicial.
   - Executa queries pesadas e serialização volumosa gerando alta latência (54.4ms).

2. **REST BFF (`GET /api/v2/dashboard`)**:
   - Aplica projeção SQL direta (`SELECT id, name, total_score, avatar_url`) atendendo exatamente às 3 propriedades exigidas pelo card da interface.
   - Reduz o payload em **3541.9x** (2.6 KB) e responde em apenas 5.6ms com **1 única query SQL**.

3. **GraphQL com DataLoader (`POST /graphql`)**:
   - Permite que o cliente declare estritamente os campos necessários via Field Selection AST.
   - Utiliza **DataLoader** para colapsar buscas relacionais N+1 em queries em lote (`WHERE id IN (...)`) com cache escopado por requisição.
   - Payload final de apenas **2.8 KB** (Gzip: **1.0 KB**), alcançando uma redução de **3249x**, gerando máxima economia de banda para clientes mobile e web.

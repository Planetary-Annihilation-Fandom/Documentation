# V8 integration inventory

This is the static V8 API inventory for server build `14190493`, recovered from PDB names and Ghidra call references. Of 352 named functions outside `v8::internal`, `v8::base` and anonymous implementations, 99 had direct references from game code; the table preserves those function names, RVAs, reference counts and caller groups.

Counts are static call sites, not executions, hotness or performance measurements. V8-internal calls were excluded; helper-function groups are analysis categories rather than recovered subsystem ownership. Addresses apply only to this executable.

| API category | Function | RVA | Static call references | Caller code groups |
|---|---|---:|---:|---|
| Isolate, contexts and handles | `v8::Persistent<v8::Value,v8::NonCopyablePersistentTraits<v8::Value>_>::~Persistent<v8::Value,v8::NonCopyablePersistentTraits<v8::Value>_>` | `0x67d80` | 16 | helper functions: 16 |
| Isolate, contexts and handles | `v8::Isolate::Scope::~Scope` | `0x69390` | 7 | helper functions: 7 |
| Isolate, contexts and handles | `v8::Context::Scope::~Scope` | `0x693b0` | 2 | helper functions: 2 |
| Isolate, contexts and handles | `v8::Isolate::CreateParams::~CreateParams` | `0x6c8f0` | 1 | helper functions: 1 |
| Other V8 API | `v8::platform::DefaultForegroundTaskRunner::NonNestableTasksEnabled` | `0x742d0` | 6 | helper functions: 6 |
| Other V8 API | `v8::CpuProfilingOptions::CpuProfilingOptions` | `0x5313c0` | 1 | helper functions: 1 |
| Isolate, contexts and handles | `v8::HandleScope::HandleScope` | `0x5315d0` | 22 | ServerScriptEnv: 5; ServerModule: 6; ServerGame: 1; SimModule: 5; ScriptArray: 1; helper functions: 3; binding modules: 1 |
| Memory and garbage collection | `v8::HeapSpaceStatistics::HeapSpaceStatistics` | `0x5315f0` | 1 | helper functions: 1 |
| Exceptions and stack diagnostics | `v8::TryCatch::TryCatch` | `0x531bf0` | 9 | ServerModule: 4; ServerScriptEnv: 1; helper functions: 3; binding modules: 1 |
| Strings | `v8::String::Utf8Value::Utf8Value` | `0x531c40` | 47 | ServerScriptEnv: 6; binding modules: 8; helper functions: 2; SimModule: 8; ServerModule: 23 |
| Isolate, contexts and handles | `v8::HandleScope::~HandleScope` | `0x5320d0` | 54 | ServerScriptEnv: 6; ServerModule: 7; ServerGame: 1; SimModule: 9; helper functions: 17; binding modules: 1; ScriptArray: 13 |
| Exceptions and stack diagnostics | `v8::TryCatch::~TryCatch` | `0x532270` | 15 | ServerModule: 4; ServerScriptEnv: 1; helper functions: 9; binding modules: 1 |
| Value conversion and type checks | `v8::Value::BooleanValue` | `0x5328f0` | 14 | binding modules: 1; helper functions: 2; SimModule: 9; ServerModule: 2 |
| Objects, arrays and functions | `v8::Function::Call` | `0x532ae0` | 8 | ServerModule: 4; ServerScriptEnv: 1; helper functions: 3 |
| Compilation and execution | `v8::Script::Compile` | `0x533020` | 1 | binding modules: 1 |
| Isolate, contexts and handles | `v8::HandleScope::CreateHandle` | `0x534590` | 94 | ServerScriptEnv: 7; ServerModule: 28; ScriptArray: 22; ServerGame: 1; SimModule: 26; binding modules: 4; helper functions: 6 |
| Isolate, contexts and handles | `v8::Object::CreationContext` | `0x5345d0` | 1 | ScriptArray: 1 |
| Exceptions and stack diagnostics | `v8::StackTrace::CurrentStackTrace` | `0x534600` | 1 | ServerModule: 1 |
| Objects, arrays and functions | `v8::Object::Delete` | `0x5349e0` | 4 | ScriptArray: 4 |
| Isolate, contexts and handles | `v8::Isolate::Dispose` | `0x534e60` | 1 | ServerScriptEnv: 1 |
| Isolate, contexts and handles | `v8::V8::Dispose` | `0x534ee0` | 1 | ServerScriptEnv: 1 |
| Isolate, contexts and handles | `v8::V8::DisposeGlobal` | `0x534ef0` | 141 | ServerScriptEnv: 8; ServerModule: 30; binding modules: 14; helper functions: 2; ScriptArray: 78; SimModule: 9 |
| Isolate, contexts and handles | `v8::Context::Enter` | `0x535680` | 15 | ServerScriptEnv: 4; ServerModule: 5; ServerGame: 1; SimModule: 1; ScriptArray: 1; helper functions: 3 |
| Isolate, contexts and handles | `v8::Isolate::Enter` | `0x5357e0` | 14 | ServerScriptEnv: 4; ServerModule: 5; ServerGame: 1; SimModule: 1; helper functions: 3 |
| Isolate, contexts and handles | `v8::Context::Exit` | `0x535960` | 33 | ServerScriptEnv: 5; ServerModule: 6; ServerGame: 1; SimModule: 5; helper functions: 3; ScriptArray: 13 |
| Isolate, contexts and handles | `v8::Isolate::Exit` | `0x535a50` | 15 | ServerScriptEnv: 5; ServerModule: 5; ServerGame: 1; SimModule: 1; helper functions: 3 |
| Other V8 API | `v8::V8::FromJustIsNothing` | `0x535f10` | 184 | ServerScriptEnv: 4; ScriptArray: 35; binding modules: 12; helper functions: 40; SimModule: 58; ServerModule: 35 |
| Objects, arrays and functions | `v8::Object::Get` | `0x5363b0` | 39 | binding modules: 1; helper functions: 20; ScriptArray: 8; SimModule: 3; ServerModule: 7 |
| Objects, arrays and functions | `v8::Object::Get` | `0x5367e0` | 59 | binding modules: 3; helper functions: 12; ScriptArray: 6; SimModule: 38 |
| Exceptions and stack diagnostics | `v8::StackFrame::GetColumn` | `0x536d10` | 1 | ServerScriptEnv: 1 |
| Isolate, contexts and handles | `v8::Isolate::GetCurrent` | `0x536e70` | 43 | ServerModule: 5; binding modules: 6; ServerScriptEnv: 10; SimModule: 22 |
| Isolate, contexts and handles | `v8::Isolate::GetCurrentContext` | `0x536e80` | 174 | ServerScriptEnv: 8; ServerModule: 47; binding modules: 23; helper functions: 21; ScriptArray: 30; SimModule: 45 |
| Exceptions and stack diagnostics | `v8::StackTrace::GetFrame` | `0x536f50` | 1 | ServerScriptEnv: 1 |
| Templates and callbacks | `v8::FunctionTemplate::GetFunction` | `0x5371a0` | 83 | binding modules: 11; SimModule: 22; ScriptArray: 18; ServerModule: 32 |
| Exceptions and stack diagnostics | `v8::StackFrame::GetFunctionName` | `0x537570` | 1 | ServerScriptEnv: 1 |
| Isolate, contexts and handles | `v8::Isolate::GetHeapSpaceStatistics` | `0x537770` | 1 | helper functions: 1 |
| Exceptions and stack diagnostics | `v8::Message::GetLineNumber` | `0x5379a0` | 1 | ServerScriptEnv: 1 |
| Exceptions and stack diagnostics | `v8::StackFrame::GetLineNumber` | `0x537b10` | 1 | ServerScriptEnv: 1 |
| Objects, arrays and functions | `v8::Object::GetOwnPropertyNames` | `0x537b20` | 4 | ScriptArray: 4 |
| Objects, arrays and functions | `v8::Object::GetPropertyNames` | `0x537b60` | 6 | binding modules: 1; helper functions: 1; ScriptArray: 4 |
| Exceptions and stack diagnostics | `v8::StackFrame::GetScriptName` | `0x5380f0` | 1 | ServerScriptEnv: 1 |
| Exceptions and stack diagnostics | `v8::Message::GetScriptResourceName` | `0x538600` | 1 | ServerScriptEnv: 1 |
| Isolate, contexts and handles | `v8::Context::GetSecurityToken` | `0x5386c0` | 1 | ServerScriptEnv: 1 |
| Exceptions and stack diagnostics | `v8::Message::GetStartColumn` | `0x538740` | 1 | ServerScriptEnv: 1 |
| Isolate, contexts and handles | `v8::Context::Global` | `0x538960` | 7 | ServerModule: 1; ServerScriptEnv: 2; helper functions: 3; binding modules: 1 |
| Isolate, contexts and handles | `v8::V8::GlobalizeReference` | `0x538ad0` | 97 | ServerScriptEnv: 7; ScriptArray: 59; ServerModule: 16; binding modules: 10; SimModule: 5 |
| Objects, arrays and functions | `v8::Object::Has` | `0x538bd0` | 30 | helper functions: 13; ScriptArray: 5; SimModule: 12 |
| Objects, arrays and functions | `v8::Object::HasRealNamedCallbackProperty` | `0x539070` | 4 | ScriptArray: 4 |
| Isolate, contexts and handles | `v8::V8::Initialize` | `0x5397b0` | 1 | ServerScriptEnv: 1 |
| Isolate, contexts and handles | `v8::V8::InitializeICU` | `0x539820` | 1 | ServerScriptEnv: 1 |
| Isolate, contexts and handles | `v8::V8::InitializePlatform` | `0x539830` | 1 | ServerScriptEnv: 1 |
| Value conversion and type checks | `v8::Value::Int32Value` | `0x5399c0` | 8 | helper functions: 8 |
| Value conversion and type checks | `v8::Value::IntegerValue` | `0x539c80` | 15 | SimModule: 7; ServerModule: 8 |
| Objects, arrays and functions | `v8::Value::IsArray` | `0x53a480` | 20 | binding modules: 1; helper functions: 7; SimModule: 4; ServerModule: 8 |
| Value conversion and type checks | `v8::Value::IsBoolean` | `0x53a530` | 4 | binding modules: 1; helper functions: 1; ServerModule: 2 |
| Objects, arrays and functions | `v8::Value::IsFunction` | `0x53a570` | 8 | ServerModule: 4; ServerScriptEnv: 3; binding modules: 1 |
| Value conversion and type checks | `v8::Value::IsNumber` | `0x53a5a0` | 23 | helper functions: 11; ServerScriptEnv: 3; SimModule: 2; ServerModule: 7 |
| Objects, arrays and functions | `v8::Value::IsObject` | `0x53a5d0` | 32 | binding modules: 2; helper functions: 5; SimModule: 15; ScriptArray: 7; ServerModule: 3 |
| Value conversion and type checks | `v8::Value::IsTrue` | `0x53a650` | 1 | helper functions: 1 |
| Objects, arrays and functions | `v8::Array::Length` | `0x53a960` | 32 | binding modules: 3; helper functions: 8; ScriptArray: 8; SimModule: 6; ServerModule: 7 |
| Isolate, contexts and handles | `v8::Isolate::MemoryPressureNotification` | `0x53ac30` | 1 | binding modules: 1 |
| Exceptions and stack diagnostics | `v8::TryCatch::Message` | `0x53ac90` | 1 | ServerScriptEnv: 1 |
| Objects, arrays and functions | `v8::Array::New` | `0x53ad40` | 6 | helper functions: 3; SimModule: 3 |
| Isolate, contexts and handles | `v8::Context::New` | `0x53af30` | 8 | ServerScriptEnv: 2; ScriptArray: 6 |
| Objects, arrays and functions | `v8::External::New` | `0x53af90` | 210 | ServerScriptEnv: 2; ScriptArray: 65; binding modules: 8; SimModule: 78; ServerModule: 57 |
| Templates and callbacks | `v8::FunctionTemplate::New` | `0x53b2a0` | 88 | ServerScriptEnv: 5; binding modules: 11; SimModule: 22; ScriptArray: 18; ServerModule: 32 |
| Value conversion and type checks | `v8::Integer::New` | `0x53b420` | 34 | binding modules: 3; helper functions: 9; SimModule: 8; ScriptArray: 14 |
| Isolate, contexts and handles | `v8::Isolate::New` | `0x53b4d0` | 1 | ServerScriptEnv: 1 |
| Value conversion and type checks | `v8::Number::New` | `0x53b510` | 17 | helper functions: 1; ServerScriptEnv: 2; SimModule: 13; ServerModule: 1 |
| Objects, arrays and functions | `v8::Object::New` | `0x53b580` | 7 | ServerScriptEnv: 1; binding modules: 1; helper functions: 1; SimModule: 4 |
| Templates and callbacks | `v8::ObjectTemplate::New` | `0x53b6e0` | 19 | ServerScriptEnv: 1; binding modules: 3; SimModule: 2; ScriptArray: 12; ServerModule: 1 |
| Memory and garbage collection | `v8::ArrayBuffer::Allocator::NewDefaultAllocator` | `0x53bdb0` | 1 | ServerScriptEnv: 1 |
| Value conversion and type checks | `v8::Integer::NewFromUnsigned` | `0x53bf90` | 19 | binding modules: 2; SimModule: 1; ScriptArray: 15; ServerModule: 1 |
| Strings | `v8::String::NewFromUtf8` | `0x53c010` | 244 | ServerScriptEnv: 8; ServerModule: 54; binding modules: 17; helper functions: 16; ScriptArray: 27; SimModule: 122 |
| Templates and callbacks | `v8::ObjectTemplate::NewInstance` | `0x53c300` | 29 | ScriptArray: 23; binding modules: 3; SimModule: 2; ServerModule: 1 |
| Value conversion and type checks | `v8::Value::NumberValue` | `0x53ccc0` | 29 | ServerScriptEnv: 3; helper functions: 10; SimModule: 13; ServerModule: 3 |
| Compilation and execution | `v8::Script::Run` | `0x53df70` | 1 | binding modules: 1 |
| Objects, arrays and functions | `v8::Object::Set` | `0x53e4b0` | 13 | helper functions: 7; SimModule: 6 |
| Objects, arrays and functions | `v8::Object::Set` | `0x53e7a0` | 61 | binding modules: 12; helper functions: 2; ScriptArray: 4; SimModule: 19; ServerModule: 24 |
| Templates and callbacks | `v8::Template::Set` | `0x53ea30` | 5 | ServerScriptEnv: 5 |
| Templates and callbacks | `v8::ObjectTemplate::SetAccessor` | `0x53ec30` | 108 | ServerScriptEnv: 3; SimModule: 56; ScriptArray: 24; ServerModule: 25 |
| Templates and callbacks | `v8::ObjectTemplate::SetHandler` | `0x53f910` | 7 | binding modules: 1; ScriptArray: 6 |
| Templates and callbacks | `v8::ObjectTemplate::SetHandler` | `0x53fa40` | 1 | binding modules: 1 |
| Objects, arrays and functions | `v8::Object::SetInternalField` | `0x53fd10` | 17 | ScriptArray: 17 |
| Templates and callbacks | `v8::ObjectTemplate::SetInternalFieldCount` | `0x53fe30` | 6 | ScriptArray: 6 |
| Objects, arrays and functions | `v8::Object::SetPrototype` | `0x53fff0` | 17 | ScriptArray: 17 |
| Isolate, contexts and handles | `v8::Context::SetSecurityToken` | `0x540360` | 1 | ServerScriptEnv: 1 |
| Other V8 API | `v8::V8::ShutdownPlatform` | `0x540460` | 1 | ServerScriptEnv: 1 |
| Objects, arrays and functions | `v8::Object::SlowGetInternalField` | `0x540470` | 1 | ScriptArray: 1 |
| Exceptions and stack diagnostics | `v8::TryCatch::StackTrace` | `0x540570` | 1 | ServerScriptEnv: 1 |
| Isolate, contexts and handles | `v8::V8::ToLocalEmpty` | `0x541d60` | 466 | ServerScriptEnv: 9; ScriptArray: 90; ServerModule: 94; binding modules: 36; helper functions: 50; SimModule: 187 |
| Value conversion and type checks | `v8::Value::ToNumber` | `0x541dd0` | 1 | helper functions: 1 |
| Value conversion and type checks | `v8::Value::Uint32Value` | `0x542730` | 2 | SimModule: 1; ScriptArray: 1 |
| Objects, arrays and functions | `v8::External::Value` | `0x542cd0` | 177 | ScriptArray: 20; binding modules: 8; SimModule: 88; ServerModule: 61 |
| Value conversion and type checks | `v8::Number::Value` | `0x542d60` | 1 | helper functions: 1 |
| Isolate, contexts and handles | `v8::Locker::~Locker` | `0x5437d0` | 20 | ServerScriptEnv: 4; ServerModule: 5; ServerGame: 1; SimModule: 1; helper functions: 9 |
| Isolate, contexts and handles | `v8::Locker::Initialize` | `0x543a80` | 13 | ServerScriptEnv: 3; ServerModule: 5; ServerGame: 1; SimModule: 1; helper functions: 3 |
| Other V8 API | `v8::platform::NewDefaultPlatform` | `0x544880` | 1 | ServerScriptEnv: 1 |
| Other V8 API | `v8::platform::DefaultJobHandle::IsRunning` | `0x6cde70` | 3 | helper functions: 3 |

See [Alternative JavaScript runtime](Alternative%20JavaScript%20runtime.md) for module initialization, callback ABI, compatibility tests and their limits. This inventory was transferred from the original research report; the associated machine-readable inventories and analysis databases remain research evidence in pa-research-data.

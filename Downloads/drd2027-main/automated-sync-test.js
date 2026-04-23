// automated-sync-test.js
// UV: SYNC-TEST-2026-03-09
// الاختبار الشامل لمكونات الحفظ والمزامنة

(async function() {
  console.log('🧪 [TEST] بدء اختبار المزامنة الشامل...');
  
  const testResults = {
    indexedDB: false,
    sqlite: false,
    assetBus: false,
    uiEvents: false
  };

  const testCode = 'TEST-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  console.log('📝 [TEST] الكود المستخدم للاختبار:', testCode);

  // 1. مراقبة الأحداث
  window.addEventListener('assets:updated', (e) => {
    if (e.detail && e.detail.code === testCode) {
      console.log('✅ [TEST] تم استقبال حدث assets:updated بنجاح');
      testResults.uiEvents = true;
    }
  });

  // 2. اختبار الحفظ
  try {
    console.log('💾 [TEST] محاولة حفظ الكود عبر StorageAdapter...');
    const result = await window.StorageAdapter.saveCode(testCode, 'test');
    console.log('💾 [TEST] نتيجة الحفظ المحلي:', result);
    testResults.indexedDB = result;

    // 3. التحقق من IndexedDB مباشرة
    if (window.StorageAdapter.getCodes) {
      const allCodes = await window.StorageAdapter.getCodes();
      const found = allCodes.find(c => c.code === testCode);
      if (found) {
        console.log('✅ [TEST] الكود موجود في IndexedDB مع id صالح:', found.id);
      } else {
        console.error('❌ [TEST] الكود غير موجود في IndexedDB!');
        testResults.indexedDB = false;
      }
    }

    // 4. التحقق من AssetBus
    if (window.AssetBus) {
      const snapshot = window.AssetBus.snapshot();
      const inBus = snapshot.codes && snapshot.codes.includes(testCode);
      if (inBus) {
        console.log('✅ [TEST] الكود موجود في AssetBus snapshot');
        testResults.assetBus = true;
      }
    }

    // 5. التحقق من SQLite/Neon (نحتاج لانتظار المزامنة غير المتزامنة)
    console.log('⏳ [TEST] انتظار مزامنة SQLite/Neon...');
    await new Promise(r => setTimeout(r, 2000));
    
    // ملاحظة: لا يمكننا التأكد 100% من نجاح API fetch في بيئة الاختبار بدون Mocking
    // ولكننا نراقب الكونسول لرسائل النجاح
    console.log('ℹ️ [TEST] يرجى مراجعة الكونسول للتأكد من رسالة [SQLITE SYNC SUCCESS]');

  } catch (e) {
    console.error('❌ [TEST] حدث خطأ أثناء الاختبار:', e);
  }

  console.log('📊 [TEST] ملخص النتائج:', testResults);
  if (Object.values(testResults).every(v => v === true)) {
    console.log('🎉 [TEST] نجحت جميع الاختبارات المحلية!');
  } else {
    console.warn('⚠️ [TEST] بعض الاختبارات لم تكتمل، يرجى مراجعة التفاصيل.');
  }
})();

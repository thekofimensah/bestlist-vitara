// Replace the onClick handler in ProfileView.jsx line 264-299 with this:

onClick={async () => {
  console.log('🔍 [ProfileView] Debug: Testing MULTIPLE approaches');
  
  // Test 1: Basic fetch to Supabase (like before)
  try {
    console.log('🔍 [ProfileView] Test 1: Basic fetch to Supabase...');
    const start1 = Date.now();
    const response = await fetch('https://jdadigamrbeenkxdkwer.supabase.co/rest/v1/lists?select=count&limit=1', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkYWRpZ2FtcmJlZW5reGRrd2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3OTYxNjIsImV4cCI6MjA2NDM3MjE2Mn0.PTTe16qs1Pamu6SSWjLBfMtlWDkgCeBxCZzhMGgv5mI',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkYWRpZ2FtcmJlZW5reGRrd2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3OTYxNjIsImV4cCI6MjA2NDM3MjE2Mn0.PTTe16qs1Pamu6SSWjLBfMtlWDkgCeBxCZzhMGgv5mI'
      }
    });
    const data = await response.text();
    const duration1 = Date.now() - start1;
    console.log('🔍 [ProfileView] Test 1 result:', { 
      duration: duration1 + 'ms',
      status: response.status,
      data: data.substring(0, 100) + '...'
    });
  } catch (err) {
    console.error('🔍 [ProfileView] Test 1 error:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
  }
  
  // Test 2: Python-style approach (lists then items)
  try {
    console.log('🔍 [ProfileView] Test 2: Python-style (lists then items)...');
    const start2 = Date.now();
    
    // Step 1: Get lists (like Python does)
    const listsResponse = await fetch('https://jdadigamrbeenkxdkwer.supabase.co/rest/v1/lists?select=*&user_id=eq.a71aeac4-f8bb-407d-ae58-02582d3b6221&order=created_at.desc', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkYWRpZ2FtcmJlZW5reGRrd2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3OTYxNjIsImV4cCI6MjA2NDM3MjE2Mn0.PTTe16qs1Pamu6SSWjLBfMtlWDkgCeBxCZzhMGgv5mI',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkYWRpZ2FtcmJlZW5reGRrd2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3OTYxNjIsImV4cCI6MjA2NDM3MjE2Mn0.PTTe16qs1Pamu6SSWjLBfMtlWDkgCeBxCZzhMGgv5mI'
      }
    });
    const listsData = await listsResponse.json();
    console.log('🔍 [ProfileView] Lists found:', listsData?.length || 0);
    
    // Step 2: Get items (like Python does)  
    if (listsData && listsData.length > 0) {
      const listIds = listsData.map(l => l.id);
      const itemsResponse = await fetch(`https://jdadigamrbeenkxdkwer.supabase.co/rest/v1/items?select=*&list_id=in.(${listIds.join(',')})`, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkYWRpZ2FtcmJlZW5reGRrd2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3OTYxNjIsImV4cCI6MjA2NDM3MjE2Mn0.PTTe16qs1Pamu6SSWjLBfMtlWDkgCeBxCZzhMGgv5mI',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkYWRpZ2FtcmJlZW5reGRrd2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3OTYxNjIsImV4cCI6MjA2NDM3MjE2Mn0.PTTe16qs1Pamu6SSWjLBfMtlWDkgCeBxCZzhMGgv5mI'
        }
      });
      const itemsData = await itemsResponse.json();
      console.log('🔍 [ProfileView] Items found:', itemsData?.length || 0);
    }
    
    const duration2 = Date.now() - start2;
    console.log('🔍 [ProfileView] Test 2 result:', { 
      duration: duration2 + 'ms',
      listsCount: listsData?.length || 0
    });
  } catch (err) {
    console.error('🔍 [ProfileView] Test 2 error:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
  }
  
  // Test 3: Supabase client simple query
  try {
    console.log('🔍 [ProfileView] Test 3: Supabase client simple...');
    const start3 = Date.now();
    const { data, error } = await supabase
      .from('lists')
      .select('count')
      .limit(1);
    const duration3 = Date.now() - start3;
    console.log('🔍 [ProfileView] Test 3 result:', { 
      duration: duration3 + 'ms',
      data, 
      error 
    });
  } catch (err) {
    console.error('🔍 [ProfileView] Test 3 error:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
  }
  
  // Test 4: Supabase client JOIN query (the problematic one)
  try {
    console.log('🔍 [ProfileView] Test 4: Supabase client JOIN query...');
    const start4 = Date.now();
    const { data, error } = await supabase
      .from('lists')
      .select(`
        id,
        name,
        color,
        created_at,
        items (
          id,
          name,
          image_url,
          rating,
          is_stay_away,
          created_at,
          notes
        )
      `)
      .eq('user_id', 'a71aeac4-f8bb-407d-ae58-02582d3b6221')
      .order('created_at', { ascending: false })
      .order('created_at', { referencedTable: 'items', ascending: false });
    const duration4 = Date.now() - start4;
    console.log('🔍 [ProfileView] Test 4 result:', { 
      duration: duration4 + 'ms',
      listsCount: data?.length || 0,
      error 
    });
  } catch (err) {
    console.error('🔍 [ProfileView] Test 4 error:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
  }
}}
// OmniJS script to list available perspectives in OmniFocus
(() => {
  try {
    const perspectives = [];
    
    // Get all built-in perspectives
    // According to the API: Perspective.BuiltIn has these properties
    const builtInPerspectives = [
      { obj: Perspective.BuiltIn.Inbox, name: 'Inbox' },
      { obj: Perspective.BuiltIn.Projects, name: 'Projects' },
      { obj: Perspective.BuiltIn.Tags, name: 'Tags' },
      { obj: Perspective.BuiltIn.Forecast, name: 'Forecast' },
      { obj: Perspective.BuiltIn.Flagged, name: 'Flagged' },
      { obj: Perspective.BuiltIn.Review, name: 'Review' }
    ];
    
    // Add built-in perspectives
    builtInPerspectives.forEach(p => {
      perspectives.push({
        id: 'builtin_' + p.name.toLowerCase(),
        name: p.name,
        type: 'builtin',
        isBuiltIn: true,
        canModify: false
      });
    });
    
    // Get all custom perspectives
    // According to the API: Perspective.Custom.all returns all custom perspectives
    try {
      const customPerspectives = Perspective.Custom.all;
      if (customPerspectives && customPerspectives.length > 0) {
        customPerspectives.forEach(p => {
          perspectives.push({
            id: p.identifier || 'custom_' + p.name.toLowerCase().replace(/\s+/g, '_'),
            name: p.name,
            type: 'custom',
            isBuiltIn: false,
            canModify: true
          });
        });
      }
    } catch (e) {
      // Custom perspectives might not be available (Standard edition)
      // This is not a fatal error
    }
    
    return JSON.stringify({
      success: true,
      perspectives: perspectives
    });
    
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.toString()
    });
  }
})()
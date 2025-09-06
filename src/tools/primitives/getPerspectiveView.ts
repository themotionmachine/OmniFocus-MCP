import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface GetPerspectiveViewParams {
  perspectiveName: string;
  limit?: number;
  includeMetadata?: boolean;
  fields?: string[];
}

interface PerspectiveViewResult {
  success: boolean;
  items?: any[];
  error?: string;
}

export async function getPerspectiveView(params: GetPerspectiveViewParams): Promise<PerspectiveViewResult> {
  const { perspectiveName, limit = 100, includeMetadata = true, fields } = params;
  
  try {
    // Create a simple script that calls the function with parameters
    const scriptContent = `
// Set parameters for perspective view
const perspectiveName = "${perspectiveName}";
const requestedLimit = ${limit};

// Load and execute the getPerspectiveView script
${await import('fs').then(fs => 
  fs.readFileSync('../../utils/omnifocusScripts/getPerspectiveView.js', 'utf8')
)}`;
    
    // Write temporary script and execute
    const tempFile = `/tmp/perspective_view_${Date.now()}.js`;
    const fs = await import('fs');
    fs.writeFileSync(tempFile, scriptContent);
    
    const result = await executeOmniFocusScript(tempFile);
    
    // Clean up temp file
    fs.unlinkSync(tempFile);
    
    // The result is already parsed JSON from the script
    if (result.error) {
      return {
        success: false,
        error: result.error
      };
    }
    
    // Filter and limit items
    let items = result.items || [];
    
    // Apply field filtering if specified
    if (fields && fields.length > 0) {
      items = items.map((item: any) => {
        const filtered: any = {};
        fields.forEach(field => {
          if (item.hasOwnProperty(field)) {
            filtered[field] = item[field];
          }
        });
        return filtered;
      });
    }
    
    // Apply limit
    if (limit && items.length > limit) {
      items = items.slice(0, limit);
    }
    
    return {
      success: true,
      items: items
    };
    
  } catch (error) {
    console.error('Error getting perspective view:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
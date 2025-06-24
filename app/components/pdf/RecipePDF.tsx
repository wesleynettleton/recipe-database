import React from 'react';
import { Page, View, Text, StyleSheet, Font, Image } from '@react-pdf/renderer';

interface RecipePDFProps {
  recipe: any;
}

interface Allergy {
    name: string;
    status: 'has' | 'may';
}

const RecipePDF = ({ recipe }: RecipePDFProps) => {
  const styles = StyleSheet.create({
    page: {
      padding: 40,
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: '#333333',
      backgroundColor: '#ffffff'
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 25,
      paddingBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#e0e0e0',
    },
    headerInfo: {
        flexDirection: 'column'
    },
    recipeName: {
      fontSize: 28,
      fontFamily: 'Helvetica-Bold',
      color: '#1a1a1a',
      marginBottom: 5,
    },
    recipeCode: {
      fontSize: 11,
      color: '#666666',
    },
    servings: {
      fontSize: 11,
      color: '#666666',
      marginTop: 2,
    },
    section: {
      marginBottom: 25,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'Helvetica-Bold',
      marginBottom: 15,
      color: '#1a1a1a',
    },
    ingredientList: {
      borderWidth: 1,
      borderColor: '#e0e0e0',
      borderRadius: 4,
      overflow: 'hidden'
    },
    ingredient: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
    },
    ingredientEven: {
        backgroundColor: '#f8f9fa'
    },
    ingredientHeader: {
        backgroundColor: '#f1f3f5',
        borderBottomWidth: 1,
        borderBottomColor: '#dee2e6'
    },
    ingredientSupplier: {
      width: '20%',
    },
    ingredientProductCode: {
      width: '15%',
    },
    ingredientName: {
      width: '25%',
    },
    ingredientQty: {
      width: '10%',
      textAlign: 'right'
    },
    ingredientAllergy: {
      width: '25%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 5,
      alignItems: 'center',
      minHeight: 15 // Ensure consistent row height
    },
    boldText: {
        fontFamily: 'Helvetica',
        fontWeight: 'bold'
    },
    instructions: {
      lineHeight: 1.6,
      fontSize: 10,
    },
    notes: {
      fontFamily: 'Helvetica',
      fontStyle: 'italic',
      fontSize: 10,
      color: '#555555',
      backgroundColor: '#f8f9fa',
      padding: 12,
      borderRadius: 4,
      borderLeftWidth: 3,
      borderLeftColor: '#ced4da'
    },
    allergySection: {
        position: 'absolute',
        bottom: 50,
        left: 40,
        right: 40
    },
    allergySummary: {
      marginTop: 15,
      padding: 12,
      backgroundColor: '#fff9e6',
      borderRadius: 4,
      borderWidth: 1,
      borderColor: '#ffe8b3',
    },
    allergyTitle: {
      fontSize: 14,
      fontFamily: 'Helvetica-Bold',
      marginBottom: 8,
      color: '#d46b08',
    },
    allergyList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    allergyTag: {
      marginRight: 4,
      marginBottom: 4,
      paddingVertical: 3,
      paddingHorizontal: 6,
      borderRadius: 4,
      fontSize: 8,
      fontFamily: 'Helvetica',
      fontWeight: 'bold'
    },
    containsTag: {
      backgroundColor: '#ffe3e3',
      color: '#c53030',
    },
    mayContainTag: {
      backgroundColor: '#fff0c7',
      color: '#b45309',
    },
    footer: {
      position: 'absolute',
      bottom: 20,
      left: 40,
      right: 40,
      textAlign: 'center',
      fontSize: 8,
      color: '#aaaaaa',
    },
    confidentialityNotice: {
        marginTop: 5,
        fontSize: 8,
        fontStyle: 'italic',
    },
    photo: {
        width: '100%',
        height: 220,
        objectFit: 'cover',
        borderRadius: 5,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: '#e0e0e0'
    }
  });

  const parseAllergies = (allergies: any): Allergy[] => {
      if (!allergies) return [];
      try {
          const parsed = typeof allergies === 'string' ? JSON.parse(allergies) : allergies;
          return Array.isArray(parsed) ? parsed.map(a => {
              if (typeof a === 'string') {
                  const [name, status] = a.split(':');
                  return { name: name.trim(), status: (status?.trim() || 'has') };
              }
              if (typeof a === 'object' && a.allergy) {
                  return { name: a.allergy, status: a.status || 'has' };
              }
              return null;
          }).filter((a): a is Allergy => a !== null) : [];
      } catch {
          return [];
      }
  };

  const allergySummary = recipe.ingredients.reduce((acc: Map<string, 'has' | 'may'>, ingredient: any) => {
    const allergies = parseAllergies(ingredient.ingredientAllergies);
    allergies.forEach(allergy => {
      if (allergy && allergy.name) {
          const existing = acc.get(allergy.name);
          if (!existing || (existing === 'may' && allergy.status === 'has')) {
              acc.set(allergy.name, allergy.status);
          }
      }
    });
    return acc;
  }, new Map<string, 'has' | 'may'>());

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
          <View style={styles.headerInfo}>
              <Text style={styles.recipeName}>{recipe.name}</Text>
              <View>
                  {recipe.code && <Text style={styles.recipeCode}>Code: {recipe.code}</Text>}
                  <Text style={styles.servings}>Serves: {recipe.servings}</Text>
              </View>
          </View>
      </View>

      {recipe.photo && <Image src={recipe.photo} style={styles.photo} />}
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ingredients</Text>
         <View style={styles.ingredientList}>
             <View style={[styles.ingredient, styles.ingredientHeader]}>
                <Text style={[styles.ingredientSupplier, styles.boldText]}>Supplier</Text>
                <Text style={[styles.ingredientProductCode, styles.boldText]}>Code</Text>
                <Text style={[styles.ingredientName, styles.boldText]}>Ingredient</Text>
                <Text style={[styles.ingredientQty, styles.boldText]}>Quantity</Text>
                <Text style={[styles.ingredientAllergy, styles.boldText]}>Contains</Text>
                <Text style={[styles.ingredientAllergy, styles.boldText]}>May Contain</Text>
             </View>
              {recipe.ingredients.map((ing: any, index: number) => {
                  const allergies = parseAllergies(ing.ingredientAllergies);
                  const containsAllergies = allergies.filter(a => a.status === 'has');
                  const mayContainAllergies = allergies.filter(a => a.status === 'may');

                  return (
                    <View key={index} style={[styles.ingredient, index % 2 === 0 ? {} : styles.ingredientEven]}>
                      <Text style={styles.ingredientSupplier}>{ing.ingredientSupplier || 'N/A'}</Text>
                      <Text style={styles.ingredientProductCode}>{ing.originalProductCode}</Text>
                      <Text style={styles.ingredientName}>{ing.ingredientName}</Text>
                      <Text style={styles.ingredientQty}>{ing.quantity} {ing.unit}</Text>
                      <View style={styles.ingredientAllergy}>
                          {containsAllergies.map(a => <Text key={a.name} style={[styles.allergyTag, styles.containsTag]}>{a.name}</Text>)}
                      </View>
                      <View style={styles.ingredientAllergy}>
                          {mayContainAllergies.map(a => <Text key={a.name} style={[styles.allergyTag, styles.mayContainTag]}>{a.name}</Text>)}
                      </View>
                    </View>
                  )
              })}
          </View>
      </View>

      {recipe.instructions && (
          <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <Text style={styles.instructions}>{recipe.instructions}</Text>
          </View>
      )}
      
      {recipe.notes && (
          <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notes}>{recipe.notes}</Text>
          </View>
      )}
      
      {allergySummary.size > 0 && (
        <View style={styles.allergySection}>
            <View style={styles.allergySummary}>
              <Text style={styles.allergyTitle}>Allergy Information</Text>
              <View style={styles.allergyList}>
                {(Array.from(allergySummary.entries()) as [string, 'has' | 'may'][]).map(([name, status]) => (
                  <Text key={name} style={[
                    styles.allergyTag,
                    status === 'has' ? styles.containsTag : styles.mayContainTag
                  ]}>
                    {status === 'has' ? 'Contains' : 'May Contain'} {name}
                  </Text>
                ))}
              </View>
            </View>
        </View>
      )}

      <Text style={styles.footer}>
          Generated on {new Date().toLocaleDateString()} with RecipeDB
          <Text style={styles.confidentialityNotice}>
              Private and confidential - not to be copied or reproduced
          </Text>
      </Text>
    </Page>
  );
};

export default RecipePDF; 
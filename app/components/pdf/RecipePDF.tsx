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
      padding: 30,
      fontFamily: 'Helvetica',
      fontSize: 8,
      color: '#000000',
      backgroundColor: '#ffffff'
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 15,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#e0e0e0',
    },
    recipeName: {
      fontSize: 22,
      fontFamily: 'Helvetica-Bold',
      color: '#1a1a1a',
      marginBottom: 5,
      flex: 1,
    },
    headerRight: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        marginLeft: 20,
    },
    recipeCode: {
      fontSize: 8,
      color: '#000000',
      fontFamily: 'Helvetica-Bold',
    },
    servings: {
      fontSize: 8,
      color: '#000000',
      marginTop: 2,
      fontFamily: 'Helvetica-Bold',
    },
    section: {
      marginBottom: 15,
    },
    sectionTitle: {
      fontSize: 14,
      fontFamily: 'Helvetica-Bold',
      marginBottom: 10,
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
      padding: 5,
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
      fontSize: 8,
    },
    ingredientProductCode: {
      width: '15%',
      fontSize: 8,
    },
    ingredientName: {
      width: '35%',
      fontSize: 8,
    },
    ingredientQty: {
      width: '15%',
      textAlign: 'right',
      fontSize: 8,
    },
    ingredientAllergy: {
      width: '15%',
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
      lineHeight: 1.4,
      fontSize: 8,
      color: '#000000',
    },
    notes: {
      fontFamily: 'Helvetica',
      fontStyle: 'italic',
      fontSize: 8,
      color: '#000000',
      backgroundColor: '#f8f9fa',
      padding: 8,
      borderRadius: 4,
      borderLeftWidth: 3,
      borderLeftColor: '#ced4da'
    },
    allergySection: {
        position: 'absolute',
        bottom: 40,
        left: 30,
        right: 30
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
      fontSize: 12,
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
    footer: {
      position: 'absolute',
      bottom: 15,
      left: 30,
      right: 30,
      textAlign: 'center',
      fontSize: 6,
      color: '#aaaaaa',
    },
    confidentialityNotice: {
        marginTop: 5,
        fontSize: 6,
        fontStyle: 'italic',
    },
    photo: {
        width: '100%',
        height: 220,
        objectFit: 'cover',
        borderRadius: 5,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#e0e0e0'
    },
    substitutionNotice: {
      textAlign: 'center',
      fontStyle: 'italic',
      fontSize: 8,
      color: '#000000',
      marginVertical: 8,
      paddingVertical: 5,
      paddingHorizontal: 10,
      backgroundColor: '#f1f3f5',
      borderRadius: 4,
      borderWidth: 1,
      borderColor: '#dee2e6'
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

  const allergySummary = recipe.ingredients.reduce((acc: Set<string>, ingredient: any) => {
    const allergies = parseAllergies(ingredient.ingredientAllergies);
    allergies.forEach(allergy => {
      if (allergy && allergy.name && allergy.status === 'has') {
          acc.add(allergy.name);
      }
    });
    return acc;
  }, new Set<string>());

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
          <Text style={styles.recipeName}>{recipe.name}</Text>
          <View style={styles.headerRight}>
              {recipe.code && <Text style={styles.recipeCode}>Code: {recipe.code}</Text>}
              <Text style={styles.servings}>Serves: {recipe.servings}</Text>
          </View>
      </View>

      <Text style={styles.substitutionNotice}>
          Substitutions should be avoided. If necessary, it is vital that any replacement products are checked for allergens, by a trained member of staff.
      </Text>

      {recipe.photo && <Image src={recipe.photo} style={styles.photo} />}
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ingredients</Text>
         <View style={styles.ingredientList}>
             <View style={[styles.ingredient, styles.ingredientHeader]}>
                <Text style={[styles.ingredientSupplier, styles.boldText]}>Supplier</Text>
                <Text style={[styles.ingredientProductCode, styles.boldText]}>Code</Text>
                <Text style={[styles.ingredientName, styles.boldText]}>Ingredient</Text>
                <Text style={[styles.ingredientQty, styles.boldText]}>Quantity</Text>
                <Text style={[styles.ingredientAllergy, styles.boldText]}>Allergies</Text>
             </View>
              {recipe.ingredients.map((ing: any, index: number) => {
                  const allergies = parseAllergies(ing.ingredientAllergies);
                  const containsAllergies = allergies.filter(a => a.status === 'has');

                  return (
                    <View key={index} style={[styles.ingredient, index % 2 === 0 ? {} : styles.ingredientEven]}>
                      <Text style={styles.ingredientSupplier}>{ing.ingredientSupplier || 'N/A'}</Text>
                      <Text style={styles.ingredientProductCode}>{ing.originalProductCode}</Text>
                      <Text style={styles.ingredientName}>{ing.ingredientName}</Text>
                      <Text style={styles.ingredientQty}>{ing.quantity} {ing.unit}</Text>
                      <View style={styles.ingredientAllergy}>
                          {containsAllergies.map(a => <Text key={a.name} style={[styles.allergyTag, styles.containsTag]}>{a.name}</Text>)}
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
                {(Array.from(allergySummary) as string[]).map((name) => (
                  <Text key={name} style={[styles.allergyTag, styles.containsTag]}>
                    {name}
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